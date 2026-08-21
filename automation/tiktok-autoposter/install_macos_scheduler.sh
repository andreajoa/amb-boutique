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
mkdir -p "$HOME/Library/LaunchAgents" "$ROOT/logs" "$HOME/AMB-TikTok/inbox" "$HOME/AMB-TikTok/queued" "$HOME/AMB-TikTok/published" "$HOME/AMB-TikTok/failed"

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
    <string>$HOME/AMB-TikTok</string>
    <key>AMB_TIKTOK_TIMEZONE</key>
    <string>America/Sao_Paulo</string>
    <key>AMB_TIKTOK_SLOTS</key>
    <string>13:00,21:00</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootout "gui/$UID" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$PLIST"
echo "Installed TikTok real-video automation. Queue check interval: ${INTERVAL}s"
echo "Automatic publication slots: 13:00 and 21:00 America/Sao_Paulo"
echo "Drop real videos into: $HOME/AMB-TikTok/inbox"
echo "LaunchAgent: $PLIST"
