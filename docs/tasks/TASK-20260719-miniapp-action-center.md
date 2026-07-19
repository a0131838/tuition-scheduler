# TASK-20260719-miniapp-action-center

## Context

The employee mini program already covered scheduling, staff-assisted Tickets, teacher payroll, lesson feedback and parent communications, but each workflow lived in a separate entry. Academic Operations, Management and Teachers still needed one mobile starting point, a student-centred view, traceable correction handling, safe high-frequency approvals, fast lead capture and mobile teacher communications/reports.

## Change

- Added a role-aware unified action centre. Teacher totals include the existing payroll acknowledgement, attendance, lesson feedback, cross-teacher feedback, expense repair, notices, manager feedback and reports. Academic/management totals include Tickets, parent communications, approvals and overdue leads.
- Added a Student 360 workspace with courses, packages, open Tickets, parent contacts, risk flags and historical teacher feedback. Teachers can only search and open students linked through real teaching records; parent contacts remain hidden from Teacher accounts.
- Added a readable operation-log view and a correction-request flow. A correction creates an auditable `操作纠正` Ticket and never overwrites the original business record.
- Added a mobile management approval desk that reuses the existing guarded package-invoice, expense and teacher-payroll approval services. Complex reconciliation-only items remain read-only and point operators back to the web desk.
- Added a fast new-lead intake with duplicate detection, album/WeChat screenshot evidence and an explicit conversion to a scheduling-coordination Ticket. Creating a lead never directly creates or changes a Session.
- Added a bilingual Teacher notice, manager-feedback and teaching-report desk with notice/feedback acknowledgement, local draft recovery, guarded server draft saving and explicit report submission.
- Registered all six pages in the existing mini program and added role-aware entries to the current staff home without changing the parent mini program or web-page navigation.
- Prefilled the existing staff-assisted Ticket form when opened from Student 360.

## Permissions and safety

- Management approval access continues through the existing manager-role configuration.
- Academic operations access remains limited to `ADMIN`, `CS` or an explicit CS workspace.
- Lead access remains limited to `ADMIN`, `CS`, `SALES` or an explicit CS/Sales workspace.
- Teacher report writes require the signed-in Teacher and matching `teacherId`; forwarded, exempt, archived or locked reports remain read-only.
- Operation metadata redacts token, password, secret, authorization, signature and file-path fields.
- There is no database migration and no change to Session scheduling writes, attendance deduction, package balance calculation, invoice/receipt accounting, payroll calculation or settlement rules.

## Verification

- `node --check` passed for every changed/new native mini-program JavaScript file.
- WXML compatibility scan found no complex `&&`, `||`, comparison, negation or ternary expression in the six new native pages.
- `npx tsc --noEmit` passed.
- 34 focused mini-program, scheduling, audit and communication tests plus all 84 backend regression tests passed.
- The full Next.js production build passed with 208 generated routes/pages.
- Read-only local API smoke tests passed for Management and Teacher action centres, approvals, operations, leads, student search, Teacher reports and both role-scoped Student 360 views. Invalid write payloads returned `400`, and all temporary staff-miniapp sessions were removed.
- WeChat Developer Tools preview compilation passed at 463.5 KB (`474613` bytes).
- The 41-page mini-program release audit passed with the production API base URL, AppID, source maps, mock login, brand colour and search-protection checks all valid.

## Non-goals

- No automatic OCR or parsing of consultation screenshots was added.
- No new mini-program action bypasses the existing scheduling, attendance, package, finance, payroll or approval services.
- Receipt repair and other complex financial reconciliation remain in the full web system.
- No existing web UI was redesigned in this release.

## Risk

Medium-low. The release adds employee-miniapp pages and additive authenticated APIs, while sensitive writes reuse existing guarded services or create coordination/correction Tickets. The main remaining risk is real-device usability across Emily, Eva and Jasmine's separate account/role combinations, so the uploaded development version should be designated as the experience version and checked with one controlled real workflow per role.

## Rollback

Roll back to the production commit immediately before `2026-07-19-r269`. No data migration rollback is required. Leads, correction Tickets or approvals created after rollout are real business records and must be reviewed rather than deleted during an application rollback.
