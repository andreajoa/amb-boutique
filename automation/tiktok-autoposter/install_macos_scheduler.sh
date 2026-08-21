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
mkdir -p "$HOME/Library/LaunchAgents" "$ROOT/logs"

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
    <string>$ROOT/autoposter.py</string>
    <string>post-next</string>
    <string>--visibility</string>
    <string>public</string>
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
  </dict>
</dict>
</plist>
EOF

launchctl bootout "gui/$UID" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$PLIST"
echo "Installed TikTok autoposter scheduler. Queue check interval: ${INTERVAL}s"
echo "LaunchAgent: $PLIST"
