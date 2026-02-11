param(
  [string]$NextFile = "NEXT.md"
)

$ErrorActionPreference = "Stop"

function Run([string]$Cmd) {
  Write-Host ""
  Write-Host ("$ " + $Cmd)
  iex $Cmd
}

function FindFormActionUsages {
  Write-Host ""
  Write-Host '$ find "<form action={...}>" in app/admin + app/teacher'

  $pattern = '<form\s+action=\{'
  $paths = @("app/admin", "app/teacher")

  $rg = Get-Command rg -ErrorAction SilentlyContinue
  if ($null -ne $rg) {
    # Prefer ripgrep when available (fast + consistent output).
    & $rg.Source -n $pattern @paths -S
    return
  }

  # Fallback: PowerShell/.NET regex search (works on Windows without extra tools).
  Get-ChildItem -Path $paths -Recurse -File |
    Where-Object { $_.Extension -in ".ts", ".tsx", ".js", ".jsx" } |
    Select-String -Pattern $pattern |
    ForEach-Object { "{0}:{1}:{2}" -f $_.Path, $_.LineNumber, $_.Line.TrimEnd() }
}

if (Test-Path -LiteralPath $NextFile) {
  Write-Host "== $NextFile ==" -ForegroundColor Cyan
  Get-Content -LiteralPath $NextFile
} else {
  Write-Host "Missing $NextFile. Run ops/codex/eod.ps1 first." -ForegroundColor Yellow
}

Run "git status -sb"
FindFormActionUsages
Run "npm run build"
