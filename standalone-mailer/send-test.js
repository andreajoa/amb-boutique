#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { execSync } = require('node:child_process');

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, '.env');
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
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : '';
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
    // If terminal echo control is unavailable, continue without blocking setup.
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
      resolve(answer.trim());
    });
  });
}

async function run() {
  let envText = readEnvText();
  let apiKey = process.env.RESEND_API_KEY || getEnvValue(envText, 'RESEND_API_KEY');

  if (!apiKey) {
    console.log('One-time setup: the standalone mailer still needs its private Resend API key.');
    apiKey = await askSecret('Paste RESEND_API_KEY here (input hidden; saved only in local .env): ');
    if (!apiKey || !/^re_/.test(apiKey)) {
      throw new Error('A valid Resend API key is required. Nothing was sent.');
    }
    envText = setEnvValue(envText, 'RESEND_API_KEY', apiKey);
    fs.writeFileSync(ENV_FILE, envText, { mode: 0o600 });
    console.log('Resend key saved locally in standalone-mailer/.env.');
  }

  process.env.RESEND_API_KEY = apiKey;
  process.env.PREVIEW_ONLY = 'false';
  process.env.TEST_ONLY = 'true';
  process.env.TEST_EMAIL = email;
  process.env.SEND_LIVE = 'false';

  console.log(`Safe test mode: only ${email} can receive this run.`);
  require('./smart-send.js');
}

run().catch((error) => {
  setEcho(true);
  console.error(`\nERROR: ${error.message}`);
  process.exitCode = 1;
});
