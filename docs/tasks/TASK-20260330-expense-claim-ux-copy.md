# TASK-20260330 Expense Claim UX Copy

## Goal
- Make expense-claim receipt/status feedback clearer for teachers.
- Keep all new user-facing text bilingual and reduce ambiguity around rejected claims and missing attachments.

## Scope
- `app/teacher/expense-claims/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not change approval, payment, or archive business rules.
- Do not change claim storage structure or attachment access control.
- Only improve teacher-facing wording, status labels, and attachment-health messaging.

## Validation
1. `npm run build` passes.
2. Expense claim statuses render in bilingual human-readable labels.
3. Missing attachments show an explicit bilingual warning instead of only a failing open/download action.
4. Rejected claims show a clearer bilingual next-step card for resubmission.

## Status
- Ready to deploy on the current production branch lineage.
