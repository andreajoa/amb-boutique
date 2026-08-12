#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, '.env');
const STATE_DIR = path.join(ROOT, 'state');
const SEGMENT_STATE = path.join(STATE_DIR, 'resend-marketing-segment.json');
const SEGMENT_NAME = 'AMB Standalone Mailer';

function readEnvText() {
  return fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
}

function getEnvValue(text, key) {
  const line = text.split(/\r?\n/).find((row) => row.trim().startsWith(`${key}=`));
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : '';
}

function setEnvValue(text, key, value) {
  const rows = text ? text.split(/\r?\n/) : [];
  const index = rows.findIndex((row) => row.trim().startsWith(`${key}=`));
  if (index >= 0) rows[index] = `${key}=${value}`;
  else rows.push(`${key}=${value}`);
  return rows.join('\n').replace(/\n*$/, '\n');
}

async function resendApi(pathname, options = {}) {
  const apiKey = process.env.RESEND_API_KEY;
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
  if (!response.ok) {
    const error = new Error(`Resend ${response.status}: ${data.message || JSON.stringify(data)}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function ensureSegment(envText) {
  const fromEnv = process.env.RESEND_SEGMENT_ID || getEnvValue(envText, 'RESEND_SEGMENT_ID');
  if (fromEnv) return { id: fromEnv, envText };

  if (fs.existsSync(SEGMENT_STATE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(SEGMENT_STATE, 'utf8'));
      if (saved.id) return { id: saved.id, envText };
    } catch (_) {}
  }

  console.log(`Looking for Resend segment: ${SEGMENT_NAME}...`);
  const listed = await resendApi('/segments', { method: 'GET' });
  let segment = Array.isArray(listed.data) ? listed.data.find((item) => item.name === SEGMENT_NAME) : null;

  if (!segment) {
    console.log('Creating dedicated Resend marketing segment automatically...');
    segment = await resendApi('/segments', {
      method: 'POST',
      body: JSON.stringify({ name: SEGMENT_NAME }),
    });
  }

  if (!segment || !segment.id) throw new Error('Could not resolve a Resend Segment ID. Nothing was sent.');

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(SEGMENT_STATE, JSON.stringify({ id: segment.id, name: SEGMENT_NAME, savedAt: new Date().toISOString() }, null, 2));
  envText = setEnvValue(envText, 'RESEND_SEGMENT_ID', segment.id);
  fs.writeFileSync(ENV_FILE, envText, { mode: 0o600 });
  console.log(`Segment ready: ${SEGMENT_NAME}`);
  return { id: segment.id, envText };
}

async function run() {
  let envText = readEnvText();
  const apiKey = process.env.RESEND_API_KEY || getEnvValue(envText, 'RESEND_API_KEY');
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing. Run node send-test.js first to configure it safely. Nothing was sent.');
  }

  process.env.RESEND_API_KEY = apiKey;
  const segment = await ensureSegment(envText);

  process.env.RESEND_SEGMENT_ID = segment.id;
  process.env.PREVIEW_ONLY = 'false';
  process.env.TEST_ONLY = 'false';
  process.env.SEND_LIVE = 'true';

  console.log('LIVE MODE: sending the current campaign to all eligible CSV contacts through a Resend Broadcast.');
  console.log('The mailer will deduplicate contacts, honor its local suppression list, sync the segment, and refuse duplicate campaign IDs.');
  require('./smart-send.js');
}

run().catch((error) => {
  console.error(`\nERROR: ${error.message}`);
  if (error.status === 403) {
    console.error('If this is a Resend contacts-quota error, upgrade the Resend Marketing plan before retrying the same command.');
  }
  process.exitCode = 1;
});
