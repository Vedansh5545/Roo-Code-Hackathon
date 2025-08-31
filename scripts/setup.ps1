param(
  [string]$Python = "python",
  [string]$BackendDir = "backend",
  [string]$FrontendDir = "frontend"
)

Write-Host "==> Setting up backend (venv + deps)" -ForegroundColor Cyan
Push-Location $BackendDir

if (-Not (Test-Path ".venv")) {
  & $Python -m venv .venv
}

$activate = Join-Path (Get-Location) ".venv/Scripts/Activate.ps1"
. $activate

pip install -U pip > $null
pip install -r requirements.txt

if (-Not (Test-Path ".env")) {
  @(
    "# Create your Gemini API key at https://aistudio.google.com/app/apikey",
    "GEMINI_API_KEY=YOUR_KEY_HERE"
  ) | Set-Content .env -Encoding UTF8
  Write-Host "Created backend/.env (update GEMINI_API_KEY)." -ForegroundColor Yellow
}

Pop-Location

Write-Host "==> Setting up frontend (npm install)" -ForegroundColor Cyan
Push-Location $FrontendDir

if (-Not (Test-Path ".env")) {
  @(
    "VITE_API_BASE_URL=http://127.0.0.1:5000"
  ) | Set-Content .env -Encoding UTF8
  Write-Host "Created frontend/.env with VITE_API_BASE_URL." -ForegroundColor Yellow
}

if (Test-Path package.json) {
  npm install
}

Pop-Location

Write-Host "\nDone. Next steps:" -ForegroundColor Green
Write-Host "1) Start backend:  cd $BackendDir; ./.venv/Scripts/Activate.ps1; python app.py"
Write-Host "2) Start frontend: cd $FrontendDir; npm run dev"

