#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/setup.sh"

BACKEND_DIR="${BACKEND_DIR:-backend}"
FRONTEND_DIR="${FRONTEND_DIR:-frontend}"

echo "==> Starting Backend and Frontend (this shell controls both)"

(
  cd "$BACKEND_DIR"
  source .venv/bin/activate
  python app.py
) &
BACK_PID=$!

(
  cd "$FRONTEND_DIR"
  npm run dev
)

trap 'echo "Stopping backend..."; kill $BACK_PID 2>/dev/null || true' EXIT INT TERM
wait $BACK_PID || true

