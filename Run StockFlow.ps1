$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

function Test-Url($url) {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Start-Server($name, $workingDirectory, $command) {
  Write-Host "Starting $name..."
  $process = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/k", "cd /d `"$workingDirectory`" && $command" `
    -PassThru
  Start-Sleep -Seconds 1
  return $process
}

Write-Host "StockFlow launcher"
Write-Host "Project: $root"
Write-Host ""

if (-not (Test-Path (Join-Path $backend "node_modules"))) {
  throw "Backend dependencies are missing. Run: npm.cmd install --prefix backend"
}

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
  throw "Frontend dependencies are missing. Run: npm.cmd install --prefix frontend"
}

if (-not (Test-Url "http://127.0.0.1:5000")) {
  Start-Server "backend API" $backend "npm.cmd run start" | Out-Null
} else {
  Write-Host "Backend already running."
}

if (-not (Test-Url "http://127.0.0.1:5173")) {
  Start-Server "frontend" $frontend "npm.cmd run dev -- --host 127.0.0.1" | Out-Null
} else {
  Write-Host "Frontend already running."
}

Write-Host "Waiting for frontend..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  if (Test-Url "http://127.0.0.1:5173") {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 1
}

if (-not $ready) {
  throw "Frontend did not start on http://127.0.0.1:5173"
}

Write-Host ""
Write-Host "StockFlow is running."
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host "Backend:  http://127.0.0.1:5000"
Write-Host ""
Start-Process "http://127.0.0.1:5173"
Write-Host "Keep the backend and frontend command windows open while using the app."
