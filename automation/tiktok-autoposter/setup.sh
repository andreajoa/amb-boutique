#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
VENDOR="$ROOT/vendor/TiktokAutoUploader"
VENV="$ROOT/.venv"
UPSTREAM="https://github.com/makiisthenes/TiktokAutoUploader.git"
PIN="d29b4366edf0de705e87f265298a06b64a00d7dc"

for cmd in python3 git node npm; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Missing prerequisite: $cmd"; exit 1; }
done

mkdir -p "$ROOT/vendor" "$ROOT/data" "$ROOT/videos" "$ROOT/logs"

if [ ! -d "$VENDOR/.git" ]; then
  git clone "$UPSTREAM" "$VENDOR"
fi

git -C "$VENDOR" fetch --all --tags --prune
git -C "$VENDOR" reset --hard "$PIN"
python3 "$ROOT/patch_upstream.py" --vendor "$VENDOR"

if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
fi
PYTHON="$VENV/bin/python"
"$PYTHON" -m pip install --upgrade pip
"$PYTHON" -m pip install -r "$VENDOR/requirements.txt"

(
  cd "$VENDOR/tiktok_uploader/tiktok-signature"
  npm install
  npx playwright install chromium
)
mkdir -p "$VENDOR/CookiesDir" "$VENDOR/VideosDirPath" "$VENDOR/output"
if [ ! -f "$VENDOR/.env" ] && [ -f "$VENDOR/.env.example" ]; then
  cp "$VENDOR/.env.example" "$VENDOR/.env"
fi

echo "TikTok autoposter dependency installed at $VENDOR"
echo "Python environment: $VENV"
echo "Next: import your TikTok-only session with .venv/bin/python import_cookies.py"
