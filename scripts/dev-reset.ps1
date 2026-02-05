param(
  [int]$Port = 3000,
  [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath $projectRoot)) {
  Write-Error "Project root not found."
  exit 1
}

Write-Host "Project: $projectRoot"
Write-Host "Target:  http://$HostName`:$Port"

$escapedRoot = [Regex]::Escape($projectRoot)
$targets = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "node.exe" -and
    $_.CommandLine -match $escapedRoot -and
    (
      $_.CommandLine -match 'next\\dist\\bin\\next"\s+dev' -or
      $_.CommandLine -match 'start-server\.js' -or
      $_.CommandLine -match 'npm-cli\.js"\s+run\s+dev'
    )
  }

if ($targets.Count -gt 0) {
  $ids = @($targets | Select-Object -ExpandProperty ProcessId)
  Write-Host "Stopping old dev processes: $($ids -join ', ')"
  foreach ($id in $ids) {
    Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
  }
} else {
  Write-Host "No existing dev processes found."
}

Start-Sleep -Milliseconds 600

$nextDir = Join-Path $projectRoot ".next"
if (Test-Path -LiteralPath $nextDir) {
  Write-Host "Removing .next cache..."
  Remove-Item -LiteralPath $nextDir -Recurse -Force
} else {
  Write-Host ".next cache not found. Skipping."
}

$devCmd = "cd /d `"$projectRoot`" && npm run dev -- --hostname $HostName --port $Port"
Write-Host "Starting dev server in a new terminal..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $devCmd | Out-Null

Write-Host "Done. Open: http://$HostName`:$Port/admin"
