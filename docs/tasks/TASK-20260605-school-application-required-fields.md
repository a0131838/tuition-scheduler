# TASK 20260605 - School Application Required Fields Guard

## Request

Prevent staff-entered school application draft details from being lost after validation reminders, and mark necessary fields with `*`.

## Scope

- Add visible required-field guidance on the school application draft form.
- Mark required inputs for parent name, agreement date, first school/application, and fee-related fields.
- Add a client-side pre-submit guard so missing required details or zero total amount are caught before the server action redirect refreshes the page.

## Files Changed

- `app/admin/students/[id]/school-applications/page.tsx`
- `app/admin/students/[id]/school-applications/SchoolApplicationDraftGuard.tsx`

## Verification

- `npm run build`
- `npx tsc --noEmit --pretty false`

## Risk Notes

- Low. This only affects school application draft form validation before save.
- It does not change saved data structures, invoice numbering, receipt approval, package balances, attendance deductions, payroll, partner settlement, transport billing, student contracts, or Business Accounts.
