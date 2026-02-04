param(
  [string]$Root = (Resolve-Path ".")
)

$utf8 = New-Object System.Text.UTF8Encoding($false, $true)
$bad = @()

Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Extension -in ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".scss", ".html", ".yml", ".yaml", ".prisma"
  } |
  ForEach-Object {
    try {
      $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
      [void]$utf8.GetString($bytes)
    } catch {
      $bad += $_.FullName
    }
  }

if ($bad.Count -eq 0) {
  Write-Host "All checked files are valid UTF-8." -ForegroundColor Green
  exit 0
}

Write-Host "Non-UTF-8 files detected:" -ForegroundColor Yellow
$bad | ForEach-Object { Write-Host " - $_" }
exit 1

