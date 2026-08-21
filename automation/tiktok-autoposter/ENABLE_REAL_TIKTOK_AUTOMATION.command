#!/usr/bin/env bash
set -euo pipefail

PROJECT="$HOME/amb-boutique-tiktok"
MODULE="$PROJECT/automation/tiktok-autoposter"
DROPBOX="$HOME/Downloads/AMB-TikTok"

clear
printf '\nAMB BOUTIQUE — ENABLE REAL TIKTOK AUTOMATION\n'
printf '============================================\n\n'

if [ ! -d "$PROJECT/.git" ]; then
  echo "Project not found at $PROJECT"
  echo "Run FIRST_TIKTOK_LIVE_TEST.command once before enabling real automation."
  read -r -p 'Press Enter to close...'
  exit 1
fi

echo 'Updating the TikTok automation project...'
git -C "$PROJECT" checkout main >/dev/null 2>&1 || true
git -C "$PROJECT" pull --ff-only

if [ ! -x "$MODULE/.venv/bin/python" ]; then
  echo 'TikTok Python environment is missing. Run the first live test setup again.'
  read -r -p 'Press Enter to close...'
  exit 1
fi

COOKIE="$MODULE/vendor/TiktokAutoUploader/CookiesDir/tiktok_session-amb-boutique.cookie"
if [ ! -f "$COOKIE" ]; then
  echo 'TikTok session cookie file is missing. Import your TikTok cookies again before enabling automation.'
  read -r -p 'Press Enter to close...'
  exit 1
fi

bash "$MODULE/MIGRATE_TIKTOK_FOLDER.command"
mkdir -p "$DROPBOX/inbox" "$DROPBOX/queued" "$DROPBOX/published" "$DROPBOX/failed"

echo 'Installing the automatic real-video queue...'
bash "$MODULE/install_macos_scheduler.sh" 60

echo
echo 'Automation enabled.'
echo 'Put real .mp4, .mov or .m4v videos into:'
echo "  $DROPBOX/inbox"
echo
echo 'Default publication slots:'
echo '  09:00, 12:00, 15:00, 18:00, 21:00 and 23:00 (America/Sao_Paulo)'
echo '  missed cycles have a 45-minute grace window'
echo
echo 'Automatic music:'
echo '  - the fashion style is inferred from the product/video'
echo '  - an original AMB instrumental bed is selected/generated locally'
echo '  - music is mixed into a temporary publishing copy before upload'
echo '  - the source video in inbox is never modified'
echo
echo 'If no metadata file is supplied:'
echo '  - product name comes from the video filename'
echo '  - caption is generated in English'
echo '  - market hashtags rotate through US, CA, UK, AU and NZ'
echo '  - a suitable fashion soundtrack profile is selected automatically'
echo
echo 'Opening the inbox folder in Finder...'
open "$DROPBOX/inbox"

echo
echo 'DONE — drop videos into the opened folder and the Mac will handle the rest.'
read -r -p 'Press Enter to close...'
