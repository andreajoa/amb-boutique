# TikTok Fashion Autoposter

English-only TikTok publishing workflow for a women's fashion store targeting the United States, Canada, United Kingdom, Australia, and New Zealand.

The module is isolated from the storefront runtime. It uses `makiisthenes/TiktokAutoUploader` as a pinned local dependency and wraps it with queue management, credential isolation, market presets, timezone-aware scheduling, validation, and publication status tracking.

## Security

Never commit cookie exports, `.cookie` files, browser profiles, passwords, tokens, or customer data. Runtime credentials and media remain local and are excluded by `.gitignore`.

## First live test on macOS

For the first real publication, open Terminal in this folder and run:

```bash
bash FIRST_TIKTOK_LIVE_TEST.command
```

The launcher installs/updates the isolated environment, opens a macOS file picker for the TikTok cookie export, opens a second picker for the English video, imports only TikTok cookies, creates an English-only caption, performs a dry-run, publishes publicly, verifies the local success state, and enables the automatic queue checker only if publication succeeds.

## Install manually

```bash
cd automation/tiktok-autoposter
bash setup.sh
```

`setup.sh` creates a private `.venv` Python environment so the TikTok automation does not modify the Mac's global Python packages.

## Import the TikTok session

Use a Netscape-format cookie export. The importer ignores non-TikTok domains and writes only the minimal TikTok session required by the uploader.

```bash
.venv/bin/python import_cookies.py /absolute/path/to/cookies.txt --account amb-boutique
```

## Add a video

Publish as soon as the automatic runner sees it:

```bash
.venv/bin/python autoposter.py add \
  --video ./videos/look-01.mp4 \
  --product "Elegant Satin Midi Dress" \
  --market US \
  --url "https://your-store.example/products/elegant-satin-midi-dress"
```

Schedule it for an exact local time by providing an ISO 8601 timezone offset:

```bash
.venv/bin/python autoposter.py add \
  --video ./videos/look-02.mp4 \
  --product "Minimal Knit Set" \
  --market US \
  --publish-at "2026-08-22T19:00:00-04:00"
```

The scheduled time is normalized to UTC internally so daylight-saving and international schedules do not get mixed up.

Supported markets: `US`, `CA`, `UK`, `AU`, `NZ`.

If `--caption` is omitted, a short English caption and market-specific hashtag set are generated automatically.

## Review the queue

```bash
.venv/bin/python autoposter.py status
```

## Dry run

```bash
.venv/bin/python autoposter.py post-next --dry-run
```

The dry run validates the video, account session file, uploader installation, due time, and English-only caption without publishing.

## Publish manually

Private test:

```bash
.venv/bin/python autoposter.py post-next --visibility private
```

Public publication:

```bash
.venv/bin/python autoposter.py post-next --visibility public
```

A queue item is marked `published` only when the upstream uploader explicitly returns `Published successfully`. Soft failures are recorded as `failed` instead of being incorrectly treated as success.

## Automatic publishing on macOS

After the first live publication has been validated, install the LaunchAgent:

```bash
bash install_macos_scheduler.sh
```

By default it checks the queue every 15 minutes. To check every hour:

```bash
bash install_macos_scheduler.sh 3600
```

The scheduler automatically uses the module's `.venv`, publishes only due queue items, and posts only one item per run. The Mac must be powered on, logged in, and connected to the internet. Logs are written under `logs/`.

Remove the scheduler with:

```bash
bash uninstall_macos_scheduler.sh
```

## Language rule

All generated captions, CTAs, and hashtags are English. The publisher rejects captions containing common Portuguese commerce terms before it calls TikTok. Source videos intended for automatic publishing must also contain only English on-screen text and audio when speech is present.

## Market targeting

TikTok does not provide an organic-post switch that guarantees delivery only to selected countries. Market targeting here is implemented through English-language creative, market-specific hashtag presets, publishing timing, merchandising, and future performance analytics. Organic geographic distribution remains controlled by TikTok's recommendation system.

## Upstream dependency

Pinned project:

- Repository: `makiisthenes/TiktokAutoUploader`
- Commit: `d29b4366edf0de705e87f265298a06b64a00d7dc`

`setup.sh` clones the dependency locally and applies `patch_upstream.py`, which ensures the uploader loads the complete TikTok-only session state and respects the privacy/comment flags passed by this module.
