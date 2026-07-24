# TASK-20260724-package-ledger-student-attribution

## Context

The package-ledger PDF still used the legacy logo. Its transaction detail displayed internal student identifiers but not readable student names, so Finance could not distinguish which sibling used time from a shared package.

## Change

- Replaced the package-ledger header image with the approved `public/GTI2.png` asset and constrained it by both width and height while preserving its aspect ratio.
- Added read-side resolution from current `studentId` metadata and historical `attendanceId` repair metadata.
- Displayed the matching student name on each deduction or rollback row.
- Labelled unmatched deductions as `Unresolved / 未匹配` instead of silently assigning them to the package owner.
- Removed internal student and attendance identifiers from the visible PDF note.
- Listed package owner and shared students in the package summary without duplicate names.
- Measured transaction-row height before page breaks so longer student and session details do not overlap.

## Non-goals

- No package, transaction, balance or attendance data is written or backfilled.
- No change to package sharing, deduction, rollback or top-up rules.
- No change to scheduling, reminders, contracts, invoices, receipts, payroll or partner settlement.
- Previously downloaded PDFs are not rewritten; users must download a fresh copy.

## Verification

- `node --test --import tsx tests/package-ledger-detail.test.ts tests/package-ledger-format.test.ts` passed 5 tests.
- `npx tsx --test tests/*.test.ts` passed all 260 repository tests.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.
- `npm run build` passed and generated 213 routes.

## Risk

Low and read-only. Student names are resolved at export time from existing transaction, attendance, session and student records. If an old deduction lacks every supported reference, the PDF exposes that exception for manual review without changing any financial or attendance record.

## Release Record

- Release ID: `2026-07-24-r284`
- Deployment status: live at feature commit `b324c089be8eb11ddf1306ea26786a43423c3000`; PM2 PID `99894` is online and `/admin/login` returns HTTP 200.
- Production read-only checks: local, GitHub and server commits aligned; the deployed `GTI2.png` SHA-256 matched the approved source; the deployed export route referenced the student-resolution helper and unresolved-row label.
- Rollback point: `539cc82715dd8c1d4af5dfd69409eae178fcd31f`
