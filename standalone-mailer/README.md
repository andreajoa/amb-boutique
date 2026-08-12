# AMB Standalone Mailer

Manual editorial email sender for AMB BOUTIQUE. This folder is intentionally isolated from the Next.js store: it imports no application code, writes to no store database, and does not participate in checkout, automation, analytics, or deployment logic.

## One-time setup

1. Open this folder in Terminal.
2. Copy `.env.example` to `.env`.
3. Add a Resend API key and a **dedicated marketing Segment ID** to `.env`.
4. Put one or more exported CSV files inside `contacts/`. Supported columns include `Email address`, `First name`, and `Last name`.
5. Keep `PREVIEW_ONLY=true` for the first run.

Only place contacts in `contacts/` who are currently eligible to receive marketing email (for example, a SUBSCRIBED/opted-in export). The supplied CSV format does not contain a subscription-status column, so the standalone script cannot infer prior opt-outs from the file itself.

No npm install is required. The script uses Node's built-in `fetch` API, so use Node 18 or newer.

## Everyday workflow

Run:

```bash
node smart-send.js
```

The default safe run creates `preview.html` and sends nothing while `PREVIEW_ONLY=true`.

When the preview is approved, edit `.env`:

```env
PREVIEW_ONLY=false
SEND_LIVE=true
```

Then run the same command:

```bash
node smart-send.js
```

The script deduplicates CSV addresses, skips the local suppression list, syncs eligible contacts to the dedicated Resend Segment, creates a marketing Broadcast, and sends it. Resend Broadcasts provide a per-contact unsubscribe URL through `{{{RESEND_UNSUBSCRIBE_URL}}}`.

## Test before the full send

Set:

```env
PREVIEW_ONLY=false
TEST_ONLY=true
TEST_EMAIL=you@example.com
```

Then run `node smart-send.js`.

## Tomorrow's email

Edit `campaign.json`. **Always change `id`** to a new unique value, for example `amb-edit-2026-08-13`. Change subject, copy, hero and products as desired, then use the exact same command:

```bash
node smart-send.js
```

The local `state/` marker prevents the same campaign ID from being sent twice accidentally. The contact-list fingerprint also prevents re-importing the same unchanged CSV list on every new campaign.

## Local suppression

If someone asks to be removed outside Resend, add them locally with:

```bash
node smart-send.js --unsubscribe person@example.com
```

The suppression file and all CSVs are ignored by Git, so contact data is not committed to the public repository.

## Important quota note

Resend marketing Broadcasts are contact-based. Your plan must support the number of contacts in the dedicated Segment. If you choose a provider with a lower free limit, the script cannot bypass that provider quota. Do not use transactional endpoints to evade marketing-contact limits.
