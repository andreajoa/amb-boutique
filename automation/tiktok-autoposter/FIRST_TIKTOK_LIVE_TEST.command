#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

clear
printf '\nAMB BOUTIQUE — TIKTOK FIRST LIVE TEST\n'
printf '=====================================\n\n'

echo 'Installing/updating the isolated TikTok publishing environment...'
bash setup.sh

if ! command -v osascript >/dev/null 2>&1; then
  echo 'This launcher must run on macOS.'
  read -r -p 'Press Enter to close...'
  exit 1
fi

COOKIE_FILE="$(osascript <<'APPLESCRIPT'
set f to choose file with prompt "Select the Netscape cookies .txt file you exported for TikTok"
POSIX path of f
APPLESCRIPT
)"

echo
echo 'Importing TikTok-only session cookies...'
.venv/bin/python import_cookies.py "$COOKIE_FILE" --account amb-boutique

VIDEO_FILE="$(osascript <<'APPLESCRIPT'
set f to choose file with prompt "Select the English video to publish on TikTok"
POSIX path of f
APPLESCRIPT
)"

CAPTION="Fresh style, effortless confidence. Discover your next favorite look with AMB Boutique. #WomensFashion #StyleInspo #OOTD #FashionFinds"

echo
echo 'Creating the English-only test publication...'
.venv/bin/python autoposter.py add \
  --video "$VIDEO_FILE" \
  --product "AMB Boutique New Season Edit" \
  --market US \
  --caption "$CAPTION"

echo
echo 'Running pre-publication validation...'
.venv/bin/python autoposter.py post-next --dry-run

echo
echo 'Publishing the test video publicly to TikTok...'
.venv/bin/python autoposter.py post-next --visibility public

echo
echo 'Checking local publication status...'
.venv/bin/python autoposter.py status

echo
echo 'The uploader reported success. Enabling automatic queue checks every 15 minutes...'
bash install_macos_scheduler.sh 900

echo
echo 'DONE — TikTok autoposter is installed and the scheduler is enabled.'
read -r -p 'Press Enter to close...'
