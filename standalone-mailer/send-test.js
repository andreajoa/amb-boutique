#!/usr/bin/env node
'use strict';

const email = String(process.argv[2] || 'andremuseu@gmail.com').trim();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('ERROR: Use a valid test email, e.g. node send-test.js andremuseu@gmail.com');
  process.exit(1);
}

// Force the existing standalone mailer into safe test-only mode.
// These process values take priority because smart-send.js does not overwrite
// environment values that are already set before it loads standalone-mailer/.env.
process.env.PREVIEW_ONLY = 'false';
process.env.TEST_ONLY = 'true';
process.env.TEST_EMAIL = email;
process.env.SEND_LIVE = 'false';

console.log(`Safe test mode: only ${email} can receive this run.`);
require('./smart-send.js');
