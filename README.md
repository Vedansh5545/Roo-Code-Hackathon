# Roo-Code-Hackathon

Quick start
- Prereqs: Python 3.10+, Node 18+
- One-time setup:
  - Windows PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/setup.ps1`
  - macOS/Linux: `bash scripts/setup.sh`

Run
- Backend: `cd backend && ./.venv/Scripts/Activate.ps1` (Windows) or `source .venv/bin/activate` (macOS/Linux), then `python app.py`
- Frontend: `cd frontend && npm run dev`

Start both (one command)
- Windows PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/start.ps1`
- macOS/Linux: `bash scripts/start.sh`

Config
- Backend: put your key in `backend/.env` as `GEMINI_API_KEY=...`
- Frontend: `frontend/.env` may override `VITE_API_BASE_URL` (defaults to `http://127.0.0.1:5000`).

API
- `POST /api/summarize` multipart `file` (.pdf or .txt)
- Response JSON: `{ key_points: string[], eli5: string, action_items: string[], summary: string }`
