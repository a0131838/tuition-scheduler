# TASK-20260423 Student Type Direct-Billing Alias Cleanup

## Goal

Avoid splitting direct-billing students across two different student-type labels:

- legacy/student-created direct students already use `自己学生-*`
- the new parent-intake flow had started assigning `直客学生`

Unify the semantic meaning so new intake-created students reuse the existing `自己学生-*` taxonomy, while exports and branding logic still recognize both names.

## Scope

- Add a shared student-type semantic helper for:
  - direct-billing student types
  - legacy alias handling
- Update parent-intake student creation so it:
  - prefers `自己学生-新生`
  - falls back to any existing `自己学生-*`
  - uses `直客学生` only as a legacy fallback alias
- Update outward-facing PDF exports so direct-billing logo/branding rules recognize both:
  - `自己学生-*`
  - `直客学生`

## Non-goals

- No data migration of old student records.
- No partner-settlement flow changes.
- No contract, invoice, receipt, or scheduling rule changes.

## Key Files

- `lib/student-type-semantics.ts`
- `lib/student-parent-intake.ts`
- `app/api/exports/student-detail/[id]/route.ts`
- `app/api/exports/student-schedule/[id]/route.ts`
- `app/api/exports/package-ledger/[id]/route.ts`
- `docs/tasks/TASK-20260423-student-type-direct-billing-alias.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risks

- Low. This change only normalizes student-type semantics and export behavior.
- Existing records keep their current type labels; the change mainly prevents future split-brain classification and keeps direct-billing exports visually consistent.

## Verification

- Query current student types and confirm direct-billing students are currently split across:
  - `直客学生`
  - `自己学生-*`
- Create a fresh parent intake submission and confirm the new student is assigned to `自己学生-新生`
- Run `npm run build`
- Verify direct-billing export helpers now recognize both `自己学生-*` and `直客学生`
