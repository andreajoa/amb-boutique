#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { execSync, spawnSync } = require('node:child_process');

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, '.env');
const SMART_SEND = path.join(ROOT, 'smart-send.js');
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
      resolve(answer.trim());
    });
  });
}

function saveApiKey(envText, apiKey) {
  const updated = setEnvValue(envText, 'RESEND_API_KEY', apiKey);
  fs.writeFileSync(ENV_FILE, updated, { mode: 0o600 });
  return updated;
}

function runSafeTest(apiKey) {
  const result = spawnSync(process.execPath, [SMART_SEND], {
    cwd: ROOT,
    env: {
      ...process.env,
      RESEND_API_KEY: apiKey,
      PREVIEW_ONLY: 'false',
      TEST_ONLY: 'true',
      TEST_EMAIL: email,
      SEND_LIVE: 'false',
    },
    encoding: 'utf8',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return {
    ok: result.status === 0,
    output: `${result.stdout || ''}\n${result.stderr || ''}`,
    status: result.status,
  };
}

async function requestAndSaveKey(envText, reason) {
  if (reason) console.log(reason);
  const apiKey = await askSecret('Paste a NEW RESEND_API_KEY here (input hidden; saved only in local .env): ');
  if (!apiKey || !/^re_/.test(apiKey)) {
    throw new Error('A valid Resend API key is required. Nothing was sent.');
  }
  const updatedEnv = saveApiKey(envText, apiKey);
  console.log('New Resend key saved locally in standalone-mailer/.env.');
  return { apiKey, envText: updatedEnv };
}

async function run() {
  let envText = readEnvText();
  let apiKey = process.env.RESEND_API_KEY || getEnvValue(envText, 'RESEND_API_KEY');

  if (!apiKey) {
    const configured = await requestAndSaveKey(envText, 'One-time setup: the standalone mailer needs its private Resend API key.');
    apiKey = configured.apiKey;
    envText = configured.envText;
  }

  console.log(`Safe test mode: only ${email} can receive this run.`);
  let attempt = runSafeTest(apiKey);
  if (attempt.ok) return;

  const invalidKey = /Resend\s+401|API key is invalid|invalid api key|authentication/i.test(attempt.output);
  if (!invalidKey) {
    throw new Error('The test failed for a reason other than the API key. Nothing was sent to the contact list.');
  }

  const replacement = await requestAndSaveKey(
    envText,
    'The saved Resend API key is invalid or was revoked. Nothing was sent. Create a new Resend API key and paste it below.'
  );

  console.log(`Retrying safe test: only ${email} can receive this run.`);
  attempt = runSafeTest(replacement.apiKey);
  if (!attempt.ok) {
    throw new Error('The new API key also failed. Nothing was sent to the contact list.');
  }
}

run().catch((error) => {
  setEcho(true);
  console.error(`\nERROR: ${error.message}`);
  process.exitCode = 1;
});
