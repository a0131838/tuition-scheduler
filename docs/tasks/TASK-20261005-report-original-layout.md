# Restore original learning report layout

## Context
The user found the r474 portrait report too different from the original. The intended scope was fixing clipped content, not redesigning the report.

## Change
Restore A4 landscape and the original midterm/final card structure and colours. Keep text which fits in place. Overflow receives an explicit numbered reference and a full-text continuation panel; even a single field larger than a page can continue without a height limit. Scores remain in the original score panel with corrected spacing. Small label/body offsets remove pre-existing overlapping text. Chinese, English and bilingual labels remain supported. Pure card-rendering functions allow realistic fixture verification without database writes.

## Validation
29 focused tests cover compact one-page landscape reports, long final narratives, all midterm draft fields and seven scores, attendance snapshots, report delivery and access guards. Twelve rendered PDFs cover the real report, long midterm narrative/score, long final narrative and short report across all three languages. Extract every expected value and check every page for landscape dimensions, bounds, nonempty body and intersecting text lines. Visually inspect original-style midterm and final first pages and continuation pages. Run the production build before guarded release. Re-export the actual saved report read-only after release and compare the stored record before/after.

## Boundaries and delivery
Only PDF layout changes. Preserve status, permissions, submitted content, scores, attendance snapshots, package balances and all existing URLs. No data migration, resubmission, approval or messaging. Existing downloaded PDFs do not change automatically; deliver replacement exports. Deployment and verification artifacts are stored in 交付文件/20261005-报告PDF原版式修复.

## Release
Use sgt-safe-deploy preflight and the standard release command, then verify local/GitHub/server commit equality, PM2 and HTTP health. Rollback reference is r474 commit 5fd55a874544e3c7832bf90b5a766b1ad060ec84.
