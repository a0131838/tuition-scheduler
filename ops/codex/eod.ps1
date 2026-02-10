param(
  [string]$OutFile = "NEXT.md",
  [int]$LogCount = 12
)

$ErrorActionPreference = "Stop"

function RunGit([string[]]$GitArgs) {
  return (& git @GitArgs 2>&1 | Out-String).TrimEnd()
}

function SafeCmd([scriptblock]$fn) {
  try { return & $fn } catch { return "[error] $($_.Exception.Message)" }
}

$now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$branch = SafeCmd { (git rev-parse --abbrev-ref HEAD) 2>$null }
$status = SafeCmd { RunGit @("status", "-sb") }
$diffStat = SafeCmd { RunGit @("diff", "--stat") }
$diffName = SafeCmd { RunGit @("diff", "--name-only") }
$recentLog = SafeCmd { RunGit @("log", "-n", "$LogCount", "--oneline", "--decorate") }
$untracked = SafeCmd { RunGit @("ls-files", "--others", "--exclude-standard") }
$formsLeft = SafeCmd { (rg -n "<form\s+action=\{" app/admin app/teacher -S 2>$null | Out-String).TrimEnd() }

$lines = @()
$lines += "# NEXT"
$lines += ""
$lines += "Generated: $now"
$lines += "Branch: $branch"
$lines += ""
$lines += "## Context"
$lines += "- Goal: remove high-frequency server-actions/redirect flows that cause page flash + scroll-to-top; replace with client fetch + API + scroll preserve."
$lines += "- Deploy policy: finish a batch, then do ONE unified push + deploy."
$lines += ""
$lines += "## Current Status"
$lines += '```text'
$lines += $status
$lines += '```'
$lines += ""
$lines += "## Changed Files (diff --name-only)"
$lines += '```text'
$lines += $diffName
$lines += '```'
$lines += ""
$lines += "## Diff Summary (diff --stat)"
$lines += '```text'
$lines += $diffStat
$lines += '```'
$lines += ""
$lines += "## Recent Commits"
$lines += '```text'
$lines += $recentLog
$lines += '```'
$lines += ""
$lines += "## Untracked Files"
$lines += '```text'
$lines += $untracked
$lines += '```'
$lines += ""
$lines += "## Remaining Server-Action Forms"
$lines += "These are the remaining `<form action={...}>` occurrences that still tend to refresh the page / jump to top:"
$lines += ""
$lines += '```text'
$lines += $formsLeft
$lines += '```'
$lines += ""
$lines += "## Next Actions"
$lines += "1. Convert `app/admin/schedule/page.tsx` to client fetch + APIs (replace teacher, delete appt/session) with scroll preserve."
$lines += "2. Convert `app/admin/conflicts/page.tsx` similarly (replace teacher, cancel appt/session, change room)."
$lines += "3. Convert `app/admin/manager/users/page.tsx` similarly (manager emails + system user CRUD/reset)."
$lines += "4. Convert `app/admin/schedule/new/page.tsx` (create session/appointment) to API + client submit."
$lines += "5. Decide whether to convert low-frequency `app/admin/login/page.tsx` and `app/admin/setup/page.tsx`."
$lines += ""
$lines += "## Notes / Risks"
$lines += "- Some files had UTF-8 BOM previously; BOM was stripped in several touched files to make patching reliable."
$lines += "- Windows may warn about LF->CRLF; avoid reformat churn if possible."
$lines += ""
$lines += "## Verification"
$lines += "- Local build: `npm run build` (should pass before deploy)."

$content = ($lines -join "`n") + "`n"
Set-Content -LiteralPath $OutFile -Value $content -Encoding UTF8
Write-Host "Wrote $OutFile"
