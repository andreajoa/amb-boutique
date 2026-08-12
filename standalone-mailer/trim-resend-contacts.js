#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, '.env');
const TARGET_TOTAL = Number(process.env.RESEND_TARGET_CONTACTS || 800);
const SEGMENT_NAME = 'AMB Standalone Mailer';
const PAGE_SIZE = 100;

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(ENV_FILE);

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function api(pathname, options = {}, attempt = 0) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is missing in standalone-mailer/.env');
  const response = await fetch(`https://api.resend.com${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AMB-Standalone-Mailer/1.0',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (response.ok) return data;
  if ((response.status === 429 || response.status >= 500) && attempt < 8) {
    const retryAfter = Number(response.headers.get('retry-after'));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(750 * (2 ** attempt), 12000);
    await sleep(delay);
    return api(pathname, options, attempt + 1);
  }
  const error = new Error(`Resend ${response.status}: ${data.message || JSON.stringify(data)}`);
  error.status = response.status;
  throw error;
}

function withQuery(pathname, params) {
  const url = new URL(`https://api.resend.com${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  }
  return `${url.pathname}${url.search}`;
}

async function listAll(pathname) {
  const items = [];
  let after = '';
  let page = 0;

  while (true) {
    const pagePath = withQuery(pathname, { limit: PAGE_SIZE, after: after || undefined });
    const result = await api(pagePath, { method: 'GET' });
    const data = Array.isArray(result.data) ? result.data : [];
    items.push(...data);
    page += 1;

    if (!result.has_more || data.length === 0) break;
    const last = data[data.length - 1];
    if (!last?.id) throw new Error(`Pagination failed for ${pathname}: last item has no id.`);
    after = last.id;

    if (page > 1000) throw new Error(`Pagination safety stop for ${pathname}.`);
    await sleep(120);
  }

  return items;
}

function byOldest(a, b) {
  const at = Date.parse(a.created_at || 0) || 0;
  const bt = Date.parse(b.created_at || 0) || 0;
  return at - bt;
}

async function resolveSegmentId() {
  if (process.env.RESEND_SEGMENT_ID) return process.env.RESEND_SEGMENT_ID;
  const segments = await listAll('/segments');
  const segment = segments.find((item) => item.name === SEGMENT_NAME);
  if (!segment?.id) throw new Error(`Could not find Resend segment: ${SEGMENT_NAME}`);
  return segment.id;
}

async function main() {
  if (!Number.isInteger(TARGET_TOTAL) || TARGET_TOTAL < 1) {
    throw new Error('RESEND_TARGET_CONTACTS must be a positive integer.');
  }

  const segmentId = await resolveSegmentId();

  console.log('Reading the complete Resend contact list with pagination...');
  const allContacts = await listAll('/contacts');
  const segmentContacts = await listAll(`/segments/${encodeURIComponent(segmentId)}/contacts`);
  const segmentIds = new Set(segmentContacts.map((contact) => contact.id));

  const protectedContacts = allContacts.filter((contact) => !segmentIds.has(contact.id));
  const mailerContacts = allContacts.filter((contact) => segmentIds.has(contact.id)).sort(byOldest);

  console.log(`Current Resend contacts: ${allContacts.length}`);
  console.log(`Protected contacts outside ${SEGMENT_NAME}: ${protectedContacts.length}`);
  console.log(`Contacts in ${SEGMENT_NAME}: ${mailerContacts.length}`);
  console.log(`Target total contacts: ${TARGET_TOTAL}`);

  if (allContacts.length <= TARGET_TOTAL) {
    console.log('No trimming needed.');
    return;
  }

  if (protectedContacts.length >= TARGET_TOTAL) {
    throw new Error(`Safety stop: ${protectedContacts.length} contacts are outside ${SEGMENT_NAME}. Nothing was deleted because reaching ${TARGET_TOTAL} would require deleting contacts outside the standalone mailer segment.`);
  }

  const keepMailerCount = TARGET_TOTAL - protectedContacts.length;
  const keepMailer = mailerContacts.slice(0, keepMailerCount);
  const deleteMailer = mailerContacts.slice(keepMailerCount);

  const expectedRemaining = protectedContacts.length + keepMailer.length;
  if (expectedRemaining !== TARGET_TOTAL) {
    throw new Error(`Safety stop: computed remaining total is ${expectedRemaining}, expected ${TARGET_TOTAL}. Nothing was deleted.`);
  }

  console.log(`Keeping ${protectedContacts.length} protected contacts outside the mailer segment.`);
  console.log(`Keeping ${keepMailer.length} oldest contacts from ${SEGMENT_NAME}.`);
  console.log(`Deleting ${deleteMailer.length} newer contacts from ${SEGMENT_NAME}...`);

  let deleted = 0;
  for (const contact of deleteMailer) {
    await api(`/contacts/${encodeURIComponent(contact.id)}`, { method: 'DELETE' });
    deleted += 1;
    if (deleted % 25 === 0 || deleted === deleteMailer.length) {
      process.stdout.write(`\rContacts deleted: ${deleted}/${deleteMailer.length}`);
    }
    await sleep(130);
  }
  if (deleteMailer.length) process.stdout.write('\n');

  console.log('Verifying final Resend contact count...');
  const remaining = await listAll('/contacts');
  const remainingSegment = await listAll(`/segments/${encodeURIComponent(segmentId)}/contacts`);

  if (remaining.length !== TARGET_TOTAL) {
    throw new Error(`Verification failed: Resend reports ${remaining.length} contacts after trimming; expected ${TARGET_TOTAL}. Do not send the broadcast yet.`);
  }

  console.log(`Done. Resend now has ${remaining.length} total contacts.`);
  console.log(`${SEGMENT_NAME} now has ${remainingSegment.length} contacts.`);
  console.log(`Free-plan headroom reserved: ${Math.max(0, 1000 - remaining.length)} contacts.`);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}`);
  process.exitCode = 1;
});
