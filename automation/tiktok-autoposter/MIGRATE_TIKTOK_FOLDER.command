#!/usr/bin/env bash
set -euo pipefail

OLD="$HOME/AMB-TikTok"
NEW="$HOME/Downloads/AMB-TikTok"
MODULE="$HOME/amb-boutique-tiktok/automation/tiktok-autoposter"

mkdir -p "$HOME/Downloads"

if [ -d "$OLD" ] && [ ! -e "$NEW" ]; then
  mv "$OLD" "$NEW"
elif [ -d "$OLD" ] && [ -d "$NEW" ]; then
  mkdir -p "$NEW/inbox" "$NEW/published" "$NEW/failed" "$NEW/queued"
  for sub in inbox published failed queued; do
    if [ -d "$OLD/$sub" ]; then
      find "$OLD/$sub" -mindepth 1 -maxdepth 1 -exec mv -n {} "$NEW/$sub/" \;
    fi
  done
fi

mkdir -p "$NEW/inbox" "$NEW/published" "$NEW/failed" "$NEW/queued"

if [ -f "$MODULE/data/autoposter.db" ] && [ -x "$MODULE/.venv/bin/python" ]; then
  "$MODULE/.venv/bin/python" - <<'PY'
import sqlite3
from pathlib import Path
p = Path.home() / 'amb-boutique-tiktok/automation/tiktok-autoposter/data/autoposter.db'
old = str(Path.home() / 'AMB-TikTok') + '/'
new = str(Path.home() / 'Downloads/AMB-TikTok') + '/'
with sqlite3.connect(p) as conn:
    conn.execute("UPDATE queue SET video_path = ? || substr(video_path, ?) WHERE video_path LIKE ?", (new, len(old)+1, old+'%'))
    conn.commit()
PY
fi

echo "TikTok folder ready at: $NEW"
