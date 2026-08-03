# TASK-20260803-academic-web-scheduling-sop

## Context

The current Academic scheduling PDF reduced the core workflow to five generic actions and reused Mini Program screenshots even though the module was classified as Web training. It did not separately teach first scheduling, continuation, one-off lessons, rescheduling, cancellation/leave, teacher replacement, conflict handling, or the evidence required before closing a ticket.

## Change

- Expanded `ACADEMIC_SCHEDULING_MASTER` to 15 scenario-based steps and a 90-minute training estimate.
- Added concrete field-by-field instructions, completion signals, and stop conditions in Chinese and English.
- Captured and annotated real Web pages for Scheduling Work Orders, ticket actions, coordination, Quick Schedule, New (Single), rescheduling, Conflict Center, weekly schedule, and Daily Handover.
- Rendered a 40-page PDF with the complete Chinese section first and the complete English section second.
- Added a selective generator option so one corrected guide can be rebuilt without rewriting every current PDF.
- Updated the downloadable Web catalogue entry to the new scheduling title.
- Versioned only this module as `20260803B`; unrelated modules remain `20260803A`.

## Non-goals

- No change to production scheduling writes, tickets, classes, sessions, packages, finance gates, attendance, payroll, contracts, permissions, or Mini Program logic.
- No production scheduling action was submitted while capturing screenshots.
- No change to unrelated training-module progress.

## Verification

- PDF has 40 A4 landscape pages with zero blank or short pages.
- Extracted content includes first scheduling, continuation, rescheduling, cancellation/leave, teacher replacement, Conflict Center, Daily Handover, and `20260803B`.
- Contact-sheet and representative full-size pages passed visual inspection.
- 22 focused training tests and all 307 repository tests passed.
- TypeScript, the 231-page production build, the 54-page Mini Program audit, and `git diff --check` passed.

## Risk

Low. The corrected module intentionally requires Academic staff to complete the scheduling training again. The guide is longer and its PDF is larger, but operational code and production data are unchanged.
