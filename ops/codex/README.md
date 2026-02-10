# Codex Continuity

Goal: make it easy for Codex to resume work across days using repo state, not memory.

## End Of Day (EOD)

Run this at the end of each day to capture current worktree status and write `NEXT.md`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ops/codex/eod.ps1
```

Optional params:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ops/codex/eod.ps1 -OutFile NEXT.md -LogCount 12
```

## Start Of Day (SOD)

Run this the next day before asking Codex to continue:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ops/codex/sod.ps1
```

This prints `NEXT.md`, shows `git status`, lists remaining server-action forms, and runs a build.
