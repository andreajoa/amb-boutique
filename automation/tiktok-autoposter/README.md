# TikTok Fashion Autoposter

English-only TikTok publishing workflow for a women's fashion store targeting the United States, Canada, United Kingdom, Australia, and New Zealand.

The module is isolated from the storefront runtime. It uses `makiisthenes/TiktokAutoUploader` as a pinned local dependency for the legacy request-based publisher and adds a TikTok Studio browser workflow for native Commercial Sounds, queue management, credential isolation, market presets, timezone-aware scheduling, validation, and publication status tracking.

## Security

Never commit cookie exports, `.cookie` files, browser profiles, passwords, tokens, or customer data. Runtime credentials and media remain local and are excluded by `.gitignore`.

The Commercial Sounds publisher loads only the locally imported TikTok session. Cookie values are never printed. If the browser workflow fails, a diagnostic screenshot may be written under `logs/`; it does not intentionally expose cookie values.

## Automatic Commercial Sounds

New automatically queued videos require a native TikTok Commercial Sound by default.

Before publishing, the automation derives a short music-search profile from the product name, caption, and video filename. Examples include:

- satin/evening/glam -> `chic upbeat fashion`
- linen/summer/resort -> `bright summer fashion`
- knit/cozy/fall -> `soft cozy fashion`
- blazer/workwear -> `confident modern fashion`
- activewear -> `energetic fashion workout`
- romantic/lace -> `romantic elegant fashion`
- denim/streetwear -> `cool street fashion`

At publication time the browser workflow opens TikTok Studio, uploads the video, enters the editor, requires a Commercial Sounds/Commercial Music context, searches for a suitable track, applies a result, saves the edit, fills the English caption, and publishes.

Safety rule: if the automation cannot confirm that it is working in a commercial-music context, cannot apply a usable sound, or cannot obtain a reliable TikTok publication confirmation, the item is **not** marked published. The normal failed-item flow moves it to the dated `failed` archive instead of silently posting without the required music.

The chosen track description is stored in the local queue history as `selected_music` when TikTok confirms the workflow.

This browser integration depends on TikTok Studio's current web interface. If TikTok changes labels or editor structure, the publisher is designed to fail closed rather than fall back to the unrestricted music library.

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

`setup.sh` creates a private `.venv` Python environment so the TikTok automation does not modify the Mac's global Python packages. The pinned uploader requirements already provide Selenium and Chromium-driver support used by the TikTok Studio music workflow.

## Import the TikTok session

Use a Netscape-format cookie export. The importer ignores non-TikTok domains and writes only the minimal TikTok session required by the uploader.

```bash
.venv/bin/python import_cookies.py /absolute/path/to/cookies.txt --account amb-boutique
```

## Automatic drop folder

The default macOS drop folder is:

```text
~/Downloads/AMB-TikTok/inbox
```

A video remains in `inbox` until TikTok publication is confirmed. Successful videos move to `published/YYYY-MM-DD/` with publication date/time in the filename. Failed videos move to `failed/YYYY-MM-DD/`.

Default publication slots are:

```text
09:00, 12:00, 15:00, 18:00, 21:00, 23:00 America/Sao_Paulo
```

The LaunchAgent checks the queue every 15 minutes.

## Optional per-video metadata

A JSON file with the same stem as the video can override the automatically derived metadata.

Example for `Satin-Midi-Dress.mp4`:

```json
{
  "product": "Satin Midi Dress",
  "market": "US",
  "url": "https://example.com/products/satin-midi-dress",
  "caption": "A polished satin look for your next evening out. #WomensFashion #StyleInspo #OOTD",
  "publish_at": "2026-08-22T21:00:00-03:00",
  "music_query": "elegant runway pop",
  "music_required": true
}
```

`music_query` is optional. When omitted, the fashion profile is inferred automatically. `music_required` defaults to `true`.

## Add a video manually

Publish as soon as the automatic runner sees it:

```bash
.venv/bin/python autoposter.py add \
  --video ./videos/look-01.mp4 \
  --product "Elegant Satin Midi Dress" \
  --market US \
  --url "https://your-store.example/products/elegant-satin-midi-dress"
```

Override the Commercial Sounds search phrase:

```bash
.venv/bin/python autoposter.py add \
  --video ./videos/look-02.mp4 \
  --product "Tailored Blazer" \
  --market US \
  --music-query "modern runway electronic"
```

Only when intentionally required, `--no-music` disables native sound selection for that individual queue item.

Schedule an exact local time by providing an ISO 8601 timezone offset:

```bash
.venv/bin/python autoposter.py add \
  --video ./videos/look-03.mp4 \
  --product "Minimal Knit Set" \
  --market US \
  --publish-at "2026-08-22T21:00:00-03:00"
```

The scheduled time is normalized to UTC internally so daylight-saving and international schedules do not get mixed up.

Supported markets: `US`, `CA`, `UK`, `AU`, `NZ`.

If `--caption` is omitted, a short English caption and market-specific hashtag set are generated automatically.

## Review the queue

```bash
.venv/bin/python autoposter.py status
```

The status output includes either the planned music search or the selected track recorded after a successful native-music publication.

## Dry run

```bash
.venv/bin/python autoposter.py post-next --dry-run
```

The dry run validates the video, account session file, due time, English-only caption, planned music query, and selected publication mode without publishing.

## Automatic publishing on macOS

Install or refresh the LaunchAgent after updating the repository:

```bash
bash install_macos_scheduler.sh 900
```

The scheduler sets:

- `AMB_TIKTOK_MUSIC_MODE=native`
- `AMB_TIKTOK_REQUIRE_COMMERCIAL_MUSIC=1`
- `AMB_TIKTOK_BROWSER_HEADLESS=1`

It automatically uses the module's `.venv`, scans the Downloads inbox, and posts only one due item per run. The Mac must be powered on, logged in, connected to the internet, and have a compatible Chrome/Chromium installation available to the browser driver. Logs are written under `logs/`.

For diagnostics only, setting `AMB_TIKTOK_BROWSER_HEADLESS=0` makes the TikTok Studio Chrome window visible during publication.

Remove the scheduler with:

```bash
bash uninstall_macos_scheduler.sh
```

## Language rule

All generated captions, CTAs, and hashtags are English. The publisher rejects captions containing common Portuguese commerce terms before it calls TikTok. Source videos intended for automatic publishing must also contain only English on-screen text and audio when speech is present.

## Commercial music rule

AMB Boutique content promotes products, so the automation intentionally targets TikTok's Commercial Sounds rather than the unrestricted general music library. It does not download a Commercial Music Library track and permanently embed it into the source MP4. The music is selected inside TikTok's native editor so the sound remains associated with TikTok's commercial-music workflow.

## Market targeting

TikTok does not provide an organic-post switch that guarantees delivery only to selected countries. Market targeting here is implemented through English-language creative, market-specific hashtag presets, publishing timing, merchandising, and future performance analytics. Organic geographic distribution remains controlled by TikTok's recommendation system.

## Upstream dependency

Pinned project:

- Repository: `makiisthenes/TiktokAutoUploader`
- Commit: `d29b4366edf0de705e87f265298a06b64a00d7dc`

`setup.sh` clones the dependency locally and applies `patch_upstream.py`, which ensures the legacy uploader loads the complete TikTok-only session state and respects the privacy/comment flags passed by this module.
