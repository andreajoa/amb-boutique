#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { execSync, spawnSync } = require('node:child_process');

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, '.env');
const SMART_SEND = path.join(ROOT, 'smart-send.js');
const CAMPAIGN_FILE = path.join(ROOT, 'campaign.json');
const PREVIEW_FILE = path.join(ROOT, 'preview.html');
const email = String(process.argv[2] || 'andremuseu@gmail.com').trim();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('ERROR: Use a valid test email, e.g. node send-test.js andremuseu@gmail.com');
  process.exit(1);
}

function readEnvText() {
  return fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
}

function getEnvValue(text, key) {
  const line = text.split(/\r?\n/).find((row) => row.trim().startsWith(`${key}=`));
  if (!line) return '';
  return line.slice(line.indexOf('=') + 1).trim().replace(/^['\"]|['\"]$/g, '');
}

function normalizeSecret(value) {
  return String(value || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

function setEnvValue(text, key, value) {
  const rows = text ? text.split(/\r?\n/) : [];
  const index = rows.findIndex((row) => row.trim().startsWith(`${key}=`));
  if (index >= 0) rows[index] = `${key}=${value}`;
  else rows.push(`${key}=${value}`);
  return rows.join('\n').replace(/\n*$/, '\n');
}

function setEcho(enabled) {
  if (!process.stdin.isTTY) return;
  try {
    execSync(enabled ? 'stty echo' : 'stty -echo', { stdio: ['inherit', 'ignore', 'ignore'] });
  } catch {
    // Keep setup usable even if terminal echo control is unavailable.
  }
}

function askSecret(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write(question);
  setEcho(false);
  return new Promise((resolve) => {
    rl.question('', (answer) => {
      setEcho(true);
      process.stdout.write('\n');
      rl.close();
      resolve(normalizeSecret(answer));
    });
  });
}

function saveApiKey(envText, apiKey) {
  const updated = setEnvValue(envText, 'RESEND_API_KEY', apiKey);
  fs.writeFileSync(ENV_FILE, updated, { mode: 0o600 });
  return updated;
}

function generatePreview() {
  const result = spawnSync(process.execPath, [SMART_SEND, '--preview'], {
    cwd: ROOT,
    env: { ...process.env, PREVIEW_ONLY: 'true', TEST_ONLY: 'false', SEND_LIVE: 'false' },
    encoding: 'utf8',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error('Could not generate the email preview. Nothing was sent.');
  if (!fs.existsSync(PREVIEW_FILE)) throw new Error('preview.html was not generated. Nothing was sent.');
}

async function sendDirectTest(apiKey, envText) {
  const campaign = JSON.parse(fs.readFileSync(CAMPAIGN_FILE, 'utf8'));
  const replyTo = getEnvValue(envText, 'REPLY_TO') || 'info@ambboutique.online';
  const from = getEnvValue(envText, 'FROM_EMAIL') || 'AMB BOUTIQUE <info@ambboutique.online>';
  const html = fs.readFileSync(PREVIEW_FILE, 'utf8')
    .replace(/https:\/\/example\.com\/unsubscribe-preview/g, `mailto:${replyTo}?subject=Unsubscribe`);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AMB-Standalone-Mailer-Test/1.0',
    },
    body: JSON.stringify({
      from,
      to: [email],
      reply_to: replyTo,
      subject: `[TEST] ${campaign.subject}`,
      html,
    }),
  });

  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }

  if (!response.ok) {
    const type = data.name || data.type || data.error || 'unknown_error';
    const message = data.message || 'No message returned by Resend.';
    console.error('\nResend direct API diagnostic:');
    console.error(`HTTP status: ${response.status}`);
    console.error(`Error type: ${type}`);
    console.error(`Message: ${message}`);
    console.error('The API key itself was not printed. Nothing was sent to the contact list.');
    process.exitCode = 1;
    return false;
  }

  console.log(`Test sent to ${email}. Resend id: ${data.id || 'accepted'}`);
  return true;
}

async function run() {
  let envText = readEnvText();
  let apiKey = normalizeSecret(getEnvValue(envText, 'RESEND_API_KEY'));

  if (!apiKey) {
    console.log('One-time setup: the standalone mailer needs its private Resend API key.');
    apiKey = await askSecret('Paste RESEND_API_KEY here (input hidden; saved only in local .env): ');
    if (!apiKey || !/^re_/.test(apiKey)) throw new Error('A valid Resend API key is required. Nothing was sent.');
    envText = saveApiKey(envText, apiKey);
    console.log('Resend key saved locally in standalone-mailer/.env.');
  }

  console.log('Using the RESEND_API_KEY stored in standalone-mailer/.env.');
  console.log(`Safe test mode: only ${email} can receive this run.`);
  console.log('Generating the exact AMB email HTML, then calling Resend POST /emails directly...');

  generatePreview();
  await sendDirectTest(apiKey, envText);
}

run().catch((error) => {
  setEcho(true);
  console.error(`\nERROR: ${error.message}`);
  console.error('Nothing was sent to the contact list.');
  process.exitCode = 1;
});
