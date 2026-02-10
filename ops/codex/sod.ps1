param(
  [string]$NextFile = "NEXT.md"
)

$ErrorActionPreference = "Stop"

function Run([string]$Cmd) {
  Write-Host ""
  Write-Host ("$ " + $Cmd)
  iex $Cmd
}

if (Test-Path -LiteralPath $NextFile) {
  Write-Host "== $NextFile ==" -ForegroundColor Cyan
  Get-Content -LiteralPath $NextFile
} else {
  Write-Host "Missing $NextFile. Run ops/codex/eod.ps1 first." -ForegroundColor Yellow
}

Run "git status -sb"
Run "rg -n \"<form\\s+action=\\{\" app/admin app/teacher -S"
Run "npm run build"

