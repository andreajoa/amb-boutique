#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
loadEnv(path.join(ROOT, '.env'));

const CONFIG_FILE = path.resolve(ROOT, process.env.CAMPAIGN_FILE || 'campaign.json');
const CONTACTS_DIR = path.resolve(ROOT, process.env.CONTACTS_DIR || 'contacts');
const STATE_DIR = path.resolve(ROOT, 'state');
const LOG_DIR = path.resolve(ROOT, 'logs');
const SUPPRESSION_FILE = path.resolve(ROOT, 'suppression.txt');

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

function envBool(name, fallback = false) {
  const value = process.env[name];
  if (value == null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

function ensureDirs() {
  for (const dir of [CONTACTS_DIR, STATE_DIR, LOG_DIR]) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(SUPPRESSION_FILE)) fs.writeFileSync(SUPPRESSION_FILE, '# One email per line. This file is local-only.\n');
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ''));
  return rows.slice(1).filter((r) => r.some((v) => v.trim())).map((r) => {
    const item = {};
    headers.forEach((h, index) => { item[h] = (r[index] || '').trim(); });
    return item;
  });
}

function findField(row, candidates) {
  const normalized = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]));
  for (const candidate of candidates) {
    const value = normalized[candidate.toLowerCase()];
    if (value) return value.trim();
  }
  return '';
}

function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

function readSuppressions() {
  if (!fs.existsSync(SUPPRESSION_FILE)) return new Set();
  return new Set(fs.readFileSync(SUPPRESSION_FILE, 'utf8').split(/\r?\n/).map((x) => x.trim().toLowerCase()).filter((x) => x && !x.startsWith('#')));
}

function readContacts() {
  if (!fs.existsSync(CONTACTS_DIR)) return [];
  const files = fs.readdirSync(CONTACTS_DIR).filter((name) => name.toLowerCase().endsWith('.csv')).sort();
  const suppression = readSuppressions();
  const seen = new Set();
  const contacts = [];
  for (const file of files) {
    const rows = parseCsv(fs.readFileSync(path.join(CONTACTS_DIR, file), 'utf8'));
    for (const row of rows) {
      const email = findField(row, ['Email address', 'Email', 'email_address']).toLowerCase();
      if (!validEmail(email) || suppression.has(email) || seen.has(email)) continue;
      seen.add(email);
      contacts.push({
        email,
        firstName: findField(row, ['First name', 'First Name', 'first_name']),
        lastName: findField(row, ['Last name', 'Last Name', 'last_name']),
        sourceFile: file,
      });
    }
  }
  return contacts;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}

function siteUrl() { return (process.env.SITE_URL || 'https://ambboutique.online').replace(/\/$/, ''); }
function absoluteImage(image) { return image.startsWith('http') ? image : `${siteUrl()}${image.startsWith('/') ? '' : '/'}${image}`; }

function addTracking(url, campaignId, content) {
  const full = new URL(url.startsWith('http') ? url : `${siteUrl()}${url.startsWith('/') ? '' : '/'}${url}`);
  full.searchParams.set('utm_source', 'standalone_mailer');
  full.searchParams.set('utm_medium', 'email');
  full.searchParams.set('utm_campaign', campaignId);
  full.searchParams.set('utm_content', content);
  return full.toString();
}

function productCard(product, campaignId) {
  const url = addTracking(product.url || `/products/${product.slug}`, campaignId, `product-${product.slug}`);
  return `<td class="product" width="50%" valign="top" style="width:50%;padding:0 8px 30px;box-sizing:border-box">
    <a href="${escapeHtml(url)}" style="text-decoration:none;color:#171411">
      <img src="${escapeHtml(absoluteImage(product.image))}" width="300" alt="${escapeHtml(product.name)}" style="display:block;width:100%;height:auto;border:0;background:#f4eee4">
      <div style="padding-top:14px">
        <p style="margin:0 0 5px;color:#a16845;font:700 9px Arial,Helvetica,sans-serif;letter-spacing:.18em">${escapeHtml(product.label || 'THE AMB EDIT')}</p>
        <p style="margin:0;font:500 20px/1.3 Georgia,'Times New Roman',serif;color:#171411">${escapeHtml(product.name)}</p>
        <p style="margin:7px 0 0;color:#6d6259;font:12px Arial,Helvetica,sans-serif">${escapeHtml(product.price)}</p>
      </div>
    </a>
  </td>`;
}

function renderEmail(campaign) {
  const shopUrl = addTracking(campaign.cta.url, campaign.id, 'hero-cta');
  const products = campaign.products || [];
  const rows = [];
  for (let i = 0; i < products.length; i += 2) rows.push(`<tr>${productCard(products[i], campaign.id)}${products[i + 1] ? productCard(products[i + 1], campaign.id) : '<td width="50%"></td>'}</tr>`);
  const nav = [['DRESSES','/collections/dresses'],['TOPS','/collections/tops-blouses'],['BAGS','/collections/bags'],['HEELS','/collections/heels']]
    .map(([label, url]) => `<a href="${escapeHtml(addTracking(url, campaign.id, `nav-${label.toLowerCase()}`))}" style="color:#171411;text-decoration:none;margin:0 10px;white-space:nowrap">${label}</a>`).join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><style>@media(max-width:620px){.shell{width:100%!important}.pad{padding-left:24px!important;padding-right:24px!important}.title{font-size:38px!important}.product{display:block!important;width:100%!important;padding-left:0!important;padding-right:0!important}.nav a{display:inline-block!important;margin:4px 7px!important}}</style></head>
<body style="margin:0;padding:0;background:#eee6db;color:#171411;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(campaign.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#eee6db"><tr><td align="center" style="padding:24px 10px"><table class="shell" role="presentation" width="720" cellspacing="0" cellpadding="0" style="width:100%;max-width:720px;background:#fffdfa;border:1px solid #ddd2c4">
<tr><td align="center" style="padding:28px 20px 22px;border-bottom:1px solid #e7ded2"><div style="font:700 31px Georgia,'Times New Roman',serif;letter-spacing:.22em">AMB</div><div style="font-size:8px;letter-spacing:.42em;margin-top:4px">BOUTIQUE</div><p class="nav" style="margin:18px 0 0;font-size:10px;letter-spacing:.13em">${nav}</p></td></tr>
<tr><td><a href="${escapeHtml(shopUrl)}"><img src="${escapeHtml(absoluteImage(campaign.heroImage))}" width="720" alt="${escapeHtml(campaign.heroAlt || 'The AMB BOUTIQUE edit')}" style="display:block;width:100%;height:auto;border:0"></a></td></tr>
<tr><td class="pad" align="center" style="padding:48px 58px 44px"><p style="margin:0 0 12px;color:#a16845;font-size:10px;letter-spacing:.23em;font-weight:700">${escapeHtml(campaign.eyebrow)}</p><h1 class="title" style="margin:0;font:500 48px/1.06 Georgia,'Times New Roman',serif;letter-spacing:-.025em">${escapeHtml(campaign.headline)}</h1><p style="margin:23px auto 0;max-width:555px;color:#554d46;font-size:16px;line-height:1.75">${escapeHtml(campaign.intro)}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto 0"><tr><td bgcolor="#171411"><a href="${escapeHtml(shopUrl)}" style="display:inline-block;color:#fff;text-decoration:none;padding:17px 31px;font-size:11px;font-weight:700;letter-spacing:.15em">${escapeHtml(campaign.cta.label)}</a></td></tr></table></td></tr>
<tr><td style="border-top:1px solid #e7ded2;border-bottom:1px solid #e7ded2;background:#faf7f2;padding:17px 20px;text-align:center;color:#5d544d;font-size:10px;line-height:1.8;letter-spacing:.05em">CURATED STYLE &nbsp;·&nbsp; SECURE CHECKOUT &nbsp;·&nbsp; REAL HUMAN SUPPORT</td></tr>
<tr><td class="pad" style="padding:48px 34px 22px"><p style="margin:0 0 10px;text-align:center;color:#a16845;font-size:10px;letter-spacing:.22em;font-weight:700">${escapeHtml(campaign.productSectionEyebrow || 'THE CURRENT EDIT')}</p><h2 style="margin:0 0 30px;text-align:center;font:500 35px/1.15 Georgia,'Times New Roman',serif">${escapeHtml(campaign.productSectionTitle || 'Pieces worth a closer look.')}</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows.join('')}</table></td></tr>
<tr><td class="pad" align="center" style="padding:42px 58px 46px;background:#f4eee4;border-top:1px solid #e7ded2"><p style="margin:0 0 10px;color:#a16845;font-size:10px;letter-spacing:.22em;font-weight:700">${escapeHtml(campaign.closingEyebrow || 'THE AMB POINT OF VIEW')}</p><h2 style="margin:0;font:500 33px/1.15 Georgia,'Times New Roman',serif">${escapeHtml(campaign.closingTitle)}</h2><p style="margin:19px auto 0;max-width:545px;color:#554d46;font-size:14px;line-height:1.75">${escapeHtml(campaign.closingBody)}</p><a href="${escapeHtml(addTracking('/collections', campaign.id, 'closing-shop'))}" style="display:inline-block;margin-top:23px;color:#171411;font-size:10px;font-weight:700;letter-spacing:.14em;text-decoration:underline">EXPLORE THE FULL EDIT</a></td></tr>
<tr><td style="padding:34px 42px 27px;background:#171411;color:#fffdfa;text-align:center"><div style="font:700 27px Georgia,'Times New Roman',serif;letter-spacing:.22em">AMB</div><div style="font-size:8px;letter-spacing:.42em;margin-top:4px">BOUTIQUE</div><p style="margin:19px 0 12px;color:#cfc5bb;font-size:11px;line-height:1.8">San Diego, California · <a href="mailto:info@ambboutique.online" style="color:#fffdfa">info@ambboutique.online</a></p><p style="margin:0;color:#a99f96;font-size:10px;line-height:1.7">You are receiving this message because you joined the AMB BOUTIQUE mailing list or requested updates.<br><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#fffdfa;text-decoration:underline">Unsubscribe</a> · <a href="${escapeHtml(addTracking('/privacy', campaign.id, 'footer-privacy'))}" style="color:#fffdfa">Privacy</a> · <a href="${escapeHtml(addTracking('/terms', campaign.id, 'footer-terms'))}" style="color:#fffdfa">Terms</a></p></td></tr>
</table></td></tr></table></body></html>`;
}

function loadCampaign() {
  if (!fs.existsSync(CONFIG_FILE)) throw new Error(`Campaign file not found: ${CONFIG_FILE}`);
  const campaign = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  for (const field of ['id','name','subject','preheader','eyebrow','headline','intro','heroImage','cta','products','closingTitle','closingBody']) if (!campaign[field]) throw new Error(`Missing campaign field: ${field}`);
  return campaign;
}

async function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function api(pathname, options = {}, attempt = 0) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is missing in standalone-mailer/.env');
  const response = await fetch(`https://api.resend.com${pathname}`, { ...options, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (response.ok) return data;
  if ((response.status === 429 || response.status >= 500) && attempt < 6) {
    const retryAfter = Number(response.headers.get('retry-after'));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(1000 * (2 ** attempt), 12000);
    await sleep(delay);
    return api(pathname, options, attempt + 1);
  }
  const error = new Error(`Resend ${response.status}: ${data.message || JSON.stringify(data)}`);
  error.status = response.status;
  error.data = data;
  throw error;
}

async function syncContactsToResend(contacts, segmentId) {
  const fingerprint = crypto.createHash('sha256').update(contacts.map((c) => c.email).sort().join('\n')).digest('hex').slice(0, 16);
  const marker = path.join(STATE_DIR, `contacts-${segmentId}-${fingerprint}.json`);
  if (fs.existsSync(marker) && !envBool('FORCE_CONTACT_SYNC', false)) {
    console.log('Contact list already synced to this segment. Skipping import.');
    return { processed: contacts.length, skipped: true };
  }
  let processed = 0;
  const pauseMs = Math.max(250, Number(process.env.CONTACT_SYNC_DELAY_MS || 600));
  for (const contact of contacts) {
    try {
      await api('/contacts', { method: 'POST', body: JSON.stringify({ email: contact.email, first_name: contact.firstName || undefined, last_name: contact.lastName || undefined, unsubscribed: false, segments: [{ id: segmentId }] }) });
    } catch (error) {
      const duplicate = error.status === 409 || /already exists|duplicate/i.test(String(error.message || error));
      if (!duplicate) throw error;
      await api(`/contacts/${encodeURIComponent(contact.email)}/segments/${encodeURIComponent(segmentId)}`, { method: 'POST', body: '{}' });
    }
    processed += 1;
    if (processed % 25 === 0 || processed === contacts.length) process.stdout.write(`\rContacts processed: ${processed}/${contacts.length}`);
    await sleep(pauseMs);
  }
  process.stdout.write('\n');
  fs.writeFileSync(marker, JSON.stringify({ segmentId, fingerprint, processed, syncedAt: new Date().toISOString() }, null, 2));
  return { processed, skipped: false };
}

async function createBroadcast(campaign, segmentId) {
  const payload = {
    segment_id: segmentId,
    from: process.env.FROM_EMAIL || 'AMB BOUTIQUE <info@ambboutique.online>',
    reply_to: process.env.REPLY_TO || 'info@ambboutique.online',
    subject: campaign.subject,
    name: `${campaign.id} — ${campaign.name}`,
    html: renderEmail(campaign),
    send: true,
  };
  return api('/broadcasts', { method: 'POST', body: JSON.stringify(payload) });
}

function preview(campaign) {
  const html = renderEmail(campaign).replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, 'https://example.com/unsubscribe-preview');
  const out = path.join(ROOT, 'preview.html');
  fs.writeFileSync(out, html);
  console.log(`Preview generated: ${out}`);
}

async function sendTest(campaign) {
  const email = process.env.TEST_EMAIL;
  if (!email) throw new Error('TEST_EMAIL is missing in .env');
  const html = renderEmail(campaign).replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, `mailto:${process.env.REPLY_TO || 'info@ambboutique.online'}?subject=Unsubscribe`);
  const result = await api('/emails', { method: 'POST', body: JSON.stringify({ from: process.env.FROM_EMAIL || 'AMB BOUTIQUE <info@ambboutique.online>', to: [email], reply_to: process.env.REPLY_TO || 'info@ambboutique.online', subject: `[TEST] ${campaign.subject}`, html }) });
  console.log(`Test sent to ${email}. Resend id: ${result.id || 'accepted'}`);
}

function unsubscribeLocal(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!validEmail(normalized)) throw new Error('Use: node smart-send.js --unsubscribe email@example.com');
  const existing = readSuppressions();
  if (!existing.has(normalized)) fs.appendFileSync(SUPPRESSION_FILE, `${normalized}\n`);
  console.log(`Added to local suppression list: ${normalized}`);
}

async function main() {
  ensureDirs();
  const args = process.argv.slice(2);
  if (args[0] === '--unsubscribe') return unsubscribeLocal(args[1]);
  const campaign = loadCampaign();
  const contacts = readContacts();
  preview(campaign);
  console.log(`Campaign: ${campaign.id} — ${campaign.name}`);
  console.log(`Unique eligible CSV contacts: ${contacts.length}`);
  if (args.includes('--preview') || envBool('PREVIEW_ONLY', true)) { console.log('PREVIEW_ONLY=true. Nothing was sent.'); return; }
  if (args.includes('--test') || envBool('TEST_ONLY', false)) return sendTest(campaign);
  if (!envBool('SEND_LIVE', false)) throw new Error('SEND_LIVE is not true. Refusing to send a live campaign.');
  const segmentId = process.env.RESEND_SEGMENT_ID;
  if (!segmentId) throw new Error('RESEND_SEGMENT_ID is missing. Use a dedicated Resend Segment for this standalone mailer.');
  if (!contacts.length) throw new Error(`No CSV contacts found in ${CONTACTS_DIR}`);
  const marker = path.join(STATE_DIR, `${campaign.id}.sent.json`);
  if (fs.existsSync(marker) && !args.includes('--force')) throw new Error(`Campaign ${campaign.id} is already marked as sent. Change campaign.id for tomorrow's email, or use --force intentionally.`);
  console.log('Syncing CSV contacts to the dedicated Resend marketing segment...');
  await syncContactsToResend(contacts, segmentId);
  console.log('Creating and sending Resend Broadcast...');
  const result = await createBroadcast(campaign, segmentId);
  fs.writeFileSync(marker, JSON.stringify({ campaignId: campaign.id, broadcastId: result.id || null, sentAt: new Date().toISOString(), contactCount: contacts.length }, null, 2));
  fs.appendFileSync(path.join(LOG_DIR, 'campaigns.log'), `${new Date().toISOString()}\t${campaign.id}\t${contacts.length}\t${result.id || 'accepted'}\n`);
  console.log(`Broadcast accepted. ID: ${result.id || 'accepted'}`);
}

main().catch((error) => { console.error(`\nERROR: ${error.message}`); process.exitCode = 1; });
