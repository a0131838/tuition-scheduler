# TASK: Miniapp Scheduling Read-Only Entry

## Problem

The employee miniapp created a formal scheduling Ticket as soon as a user selected a student. Looking at a student and returning therefore polluted the web Ticket Center with long-lived `Need Info` records. The web scheduling workflow does not behave this way: opening the form is read-only and a write happens only after an explicit submit.

## Decision

- Opening a student is read-only and never creates business data.
- ADMIN direct scheduling creates Sessions and audit logs, but no Ticket.
- A scheduling coordination Ticket requires an explicit course, written coordination reason and confirmation.
- CS can inspect the same workspace and explicitly create coordination, but cannot write Sessions.
- Open coordination Tickets are deduplicated by student and course under a PostgreSQL transaction advisory lock.
- Draft form values remain local page state and are not stored as draft Tickets.

## Implementation

- Added `/api/miniapp/staff/students/[studentId]/scheduling` for read-only options and ADMIN-only signed preview/apply.
- Generalized the existing new-session validation and apply service to support either a Ticket context or a direct student context.
- Added the native `staff-student-scheduling` page with future lessons, existing coordination, direct scheduling and explicit coordination sections.
- Changed the student list action to navigation only.
- Required `intent=coordination`, `courseId` and `coordinationSummary` on the Ticket creation API.
- Added shared-student and shared-course package discovery to the direct scheduling options.
- Added release-audit and focused regression assertions preventing `openCandidate` from making a write request.

## Data Correction

The following legacy auto-created Tickets matched the exact safe-cancellation signature: employee-miniapp source, scheduling type, `Need Info`, `systemUpdated=N`, no final schedule, no completion time and not archived.

- `20260714-001` - 吕天阅
- `20260713-008` - 王钰澄（Daisy）
- `20260713-007` - 王嘉毅（Louis）
- `20260713-003` - 曾天朗
- `20260713-002` - LIU Jiaqi (刘嘉祺）

All five were changed to `Cancelled`, kept for traceability and received one audit row each with action `CANCEL_LEGACY_MINIAPP_AUTO_CREATED_SCHEDULING_TICKET`. No Session, final schedule or completion timestamp was added.

## Verification

- TypeScript passed.
- Configured backend suite passed 66/66.
- Focused miniapp scheduling tests passed 10/10.
- Miniapp release audit passed all 28 pages.
- All miniapp JavaScript passed syntax checking.
- Production build completed all 193 pages.
- A real read-only Daisy workspace returned one course, 19 qualified teachers, four campuses and 12 upcoming Sessions; open employee-miniapp scheduling Tickets remained `0` before and after.
- Global miniapp write-entry review found all other POST/PATCH/DELETE operations behind explicit save, submit, confirmation, delete, binding, logout or subscription-consent actions. No second navigation-triggered business write was found.

## Remaining Acceptance

- Server API release is live at runtime commit `d705793`; PM2 and the public health check pass.
- Post-deploy read-only verification confirms all five legacy Tickets remain cancelled with five audit rows, and there are zero open employee-miniapp scheduling Tickets.
- Upload the next WeChat experience version.
- On ADMIN phone: open a student and return, confirm Ticket count does not change; then test preview and one controlled direct scheduling action.
- On CS phone: confirm direct scheduling controls are hidden and explicit coordination requires course and reason.
