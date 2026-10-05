# Learning report PDF overflow correction

## Request and cause
The supplied midterm PDF cut off long skill assessments and examination scores and contained an empty second page. The renderer used fixed text heights and explicit clipping. Only recommendations had a continuation fallback; score cells could also invoke automatic pagination while drawing fixed-position content. Final reports similarly clipped narrative.

## Change
Replace only PDF layout with a shared flowing portrait renderer. Keep full source content and scores; wrap table values at measured heights; allow even one field longer than a page to continue. Buffered page decorations keep headers/footers out of body flow. Preserve report status/approval/role checks and attendance snapshot behavior. Support Chinese, English and bilingual labels; do not translate authored text.

## Validation
23 focused tests: midterm field and score coverage, final narrative coverage, long multi-page output, delivery, attendance snapshots, and existing route guards. Render nine actual/synthetic PDFs across three languages and compare every expected field to extracted text, allowing only whitespace changes. Inspect text bounds and overlaps on every page and manually inspect all five pages of the real report. No production business writes used for acceptance. Build and release logs and regenerated report live in the local 20261005-报告PDF修复 delivery folder.

## Deployment
Use sgt-safe-deploy preflight then the standard release command. Verify local/GitHub/server commit equality, PM2 health and HTTP status, then regenerate the real report from production read-only. No migrations or data corrections. Prior downloaded PDFs must be replaced by a new export.
