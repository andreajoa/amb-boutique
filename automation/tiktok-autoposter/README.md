# TikTok Fashion Autoposter

English-only TikTok publishing workflow for a women's fashion store targeting the United States, Canada, United Kingdom, Australia, and New Zealand.

The module is isolated from the storefront runtime. It uses `makiisthenes/TiktokAutoUploader` as a pinned local dependency and wraps it with queue management, credential isolation, market presets, validation, and publication status tracking.

## Security

Never commit cookie exports, `.cookie` files, browser profiles, passwords, tokens, or customer data. Runtime credentials and media remain local and are excluded by `.gitignore`.

## Install

```bash
cd automation/tiktok-autoposter
./setup.sh
```

## Import the TikTok session

Use a Netscape-format cookie export. The importer ignores non-TikTok domains and writes only the minimal TikTok session required by the uploader.

```bash
python3 import_cookies.py /absolute/path/to/cookies.txt --account amb-boutique
```

## Add a video

```bash
python3 autoposter.py add \
  --video ./videos/look-01.mp4 \
  --product "Elegant Satin Midi Dress" \
  --market US \
  --url "https://your-store.example/products/elegant-satin-midi-dress"
```

Supported markets: `US`, `CA`, `UK`, `AU`, `NZ`.

If `--caption` is omitted, a short English caption and market-specific hashtag set are generated automatically.

## Review the queue

```bash
python3 autoposter.py status
```

## Dry run

```bash
python3 autoposter.py post-next --dry-run
```

The dry run validates the video, account session file, uploader installation, and English-only caption without publishing.

## Publish

Private test:

```bash
python3 autoposter.py post-next --visibility private
```

Public publication:

```bash
python3 autoposter.py post-next --visibility public
```

A queue item is marked `published` only when the upstream uploader explicitly returns `Published successfully`. Soft failures are recorded as `failed` instead of being incorrectly treated as success.

## Language rule

All generated captions are English. The publisher rejects captions containing common Portuguese commerce terms before it calls TikTok.

## Market targeting

TikTok does not provide an organic-post switch that guarantees delivery only to selected countries. Market targeting here is implemented through English-language creative, market-specific hashtag presets, publishing timing, merchandising, and future performance analytics. Organic geographic distribution remains controlled by TikTok's recommendation system.

## Upstream dependency

Pinned project:

- Repository: `makiisthenes/TiktokAutoUploader`
- Commit: `d29b4366edf0de705e87f265298a06b64a00d7dc`

`setup.sh` clones the dependency locally and applies `patch_upstream.py`, which ensures the uploader loads the complete TikTok-only session state and respects the privacy/comment flags passed by this module.
