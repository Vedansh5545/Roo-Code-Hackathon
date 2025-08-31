#!/usr/bin/env bash
set -euo pipefail

PYTHON_BIN="${PYTHON:-python3}"
BACKEND_DIR="${BACKEND_DIR:-backend}"
FRONTEND_DIR="${FRONTEND_DIR:-frontend}"

echo "==> Setting up backend (venv + deps)"
cd "$BACKEND_DIR"
if [ ! -d .venv ]; then
  "$PYTHON_BIN" -m venv .venv
fi
source .venv/bin/activate
pip install -U pip >/dev/null
pip install -r requirements.txt

if [ ! -f .env ]; then
  cat > .env <<EOF
# Create your Gemini API key at https://aistudio.google.com/app/apikey
GEMINI_API_KEY=YOUR_KEY_HERE
EOF
  echo "Created backend/.env (update GEMINI_API_KEY)."
fi

cd - >/dev/null

echo "==> Setting up frontend (npm install)"
cd "$FRONTEND_DIR"
if [ ! -f .env ]; then
  echo "VITE_API_BASE_URL=http://127.0.0.1:5000" > .env
  echo "Created frontend/.env with VITE_API_BASE_URL."
fi

[ -f package.json ] && npm install

cd - >/dev/null

cat <<NEXT

Done. Next steps:
1) Start backend:  cd $BACKEND_DIR; source .venv/bin/activate; python app.py
2) Start frontend: cd $FRONTEND_DIR; npm run dev
NEXT

