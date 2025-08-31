param(
  [string]$Python = "python",
  [string]$BackendDir = "backend",
  [string]$FrontendDir = "frontend"
)

Write-Host "==> Ensuring setup is complete" -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "setup.ps1") -Python $Python -BackendDir $BackendDir -FrontendDir $FrontendDir

function Start-InNewWindow($Title, $Command) {
  $escaped = $Command.Replace('"','\"')
  Start-Process powershell -ArgumentList @("-NoExit","-Command","Write-Host '$Title' -ForegroundColor Green; $escaped")
}

$backendCmd = "cd `"$BackendDir`"; ./.venv/Scripts/Activate.ps1; python app.py"
$frontendCmd = "cd `"$FrontendDir`"; npm run dev"

Write-Host "==> Starting Backend and Frontend in separate terminals" -ForegroundColor Cyan
Start-InNewWindow "Backend" $backendCmd
Start-InNewWindow "Frontend" $frontendCmd

Write-Host "\nLaunched two terminals:" -ForegroundColor Green
Write-Host "- Backend: http://127.0.0.1:5000"
Write-Host "- Frontend: Vite dev server URL (shown in terminal)"

