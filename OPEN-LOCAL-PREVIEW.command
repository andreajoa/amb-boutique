#!/bin/zsh
set -e

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to preview AMB BOUTIQUE."
  echo "The official download page will open now. Install the LTS version, then run this file again."
  open "https://nodejs.org/en/download"
  read "?Press Return to close..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Preparing AMB BOUTIQUE for the first preview..."
  npm install
fi

echo "Starting AMB BOUTIQUE at http://127.0.0.1:3000"
npm run dev -- --hostname 127.0.0.1 --port 3000 &
AMB_PREVIEW_PID=$!
trap 'kill "$AMB_PREVIEW_PID" 2>/dev/null || true' EXIT INT TERM

for attempt in {1..60}; do
  if curl -fsS "http://127.0.0.1:3000" >/dev/null 2>&1; then
    open "http://127.0.0.1:3000"
    echo "Preview is open. Keep this Terminal window running while you browse."
    wait "$AMB_PREVIEW_PID"
    exit 0
  fi
  sleep 1
done

echo "The preview did not become ready. Review the error above and try again."
exit 1
