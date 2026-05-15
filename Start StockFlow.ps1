$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$logs = Join-Path $root "logs"
$backendLog = Join-Path $logs "backend.log"
$frontendLog = Join-Path $logs "frontend.log"

New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Test-Url($url) {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Start-NpmServer($name, $workingDirectory, $arguments, $logFile) {
  $script = "cd /d `"$workingDirectory`" && npm.cmd $arguments > `"$logFile`" 2>&1"
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $script -WindowStyle Minimized
}

if (-not (Test-Path (Join-Path $backend "node_modules"))) {
  "Backend dependencies are missing. Run npm install in the backend folder." | Set-Content $backendLog
  throw "Backend dependencies are missing."
}

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
  "Frontend dependencies are missing. Run npm install in the frontend folder." | Set-Content $frontendLog
  throw "Frontend dependencies are missing."
}

if (-not (Test-Url "http://127.0.0.1:5000")) {
  Start-NpmServer "StockFlow Backend" $backend "run start" $backendLog
}

if (-not (Test-Url "http://127.0.0.1:5173")) {
  Start-NpmServer "StockFlow Frontend" $frontend "run dev -- --host 127.0.0.1" $frontendLog
}

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  if (Test-Url "http://127.0.0.1:5173") {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 1
}

if (-not $ready) {
  Write-Host "Frontend did not become ready. Check $frontendLog"
  exit 1
}

Start-Process "http://127.0.0.1:5173"
