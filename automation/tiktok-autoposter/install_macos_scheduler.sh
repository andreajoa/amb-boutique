#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
if [ -x "$ROOT/.venv/bin/python" ]; then
  PYTHON="$ROOT/.venv/bin/python"
else
  PYTHON="$(command -v python3)"
fi
INTERVAL="${1:-900}"
PLIST="$HOME/Library/LaunchAgents/com.amb.tiktok-autoposter.plist"
DROPBOX="$HOME/Downloads/AMB-TikTok"
mkdir -p "$HOME/Library/LaunchAgents" "$ROOT/logs" "$DROPBOX/inbox" "$DROPBOX/queued" "$DROPBOX/published" "$DROPBOX/failed"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.amb.tiktok-autoposter</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PYTHON</string>
    <string>$ROOT/auto_runner.py</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$ROOT</string>
  <key>StartInterval</key>
  <integer>$INTERVAL</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$ROOT/logs/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>$ROOT/logs/launchd.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>TIKTOK_ACCOUNT_NAME</key>
    <string>amb-boutique</string>
    <key>AMB_TIKTOK_DROPBOX</key>
    <string>$DROPBOX</string>
    <key>AMB_TIKTOK_TIMEZONE</key>
    <string>America/Sao_Paulo</string>
    <key>AMB_TIKTOK_SLOTS</key>
    <string>09:00,12:00,15:00,18:00,21:00,23:00</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootout "gui/$UID" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$PLIST"
echo "Installed TikTok real-video automation. Queue check interval: ${INTERVAL}s"
echo "Automatic publication slots: 09:00, 12:00, 15:00, 18:00, 21:00 and 23:00 America/Sao_Paulo"
echo "Drop real videos into: $DROPBOX/inbox"
echo "LaunchAgent: $PLIST"
