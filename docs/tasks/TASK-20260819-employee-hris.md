# TASK-20260819 Employee HRIS

## Objective

Create a controlled HR information system for GT Educational Institute Pte. Ltd. that supports Jasmine as HR approver, current full-time employees, inherited HR records, leave/OIL tracking and monthly payslips without exposing finance data to teaching or academic-operations staff.

## Delivered scope

- Employee profiles linked to existing user and teacher accounts, legal entity, manager, employment dates and eligibility.
- Local and foreign employee lifecycle checklists based on the supplied HR checklist and filing structure.
- Private HR document upload/download with file hashing, duplicate prevention, sensitivity levels, audit logging and storage outside `public`.
- Production HR files are stored in an owner-only persistent directory outside the application checkout so clean deployments cannot remove them.
- Idempotent legacy HR document importer for inherited employee folders; source files are never added to Git.
- Leave policies, annual entitlement grants, manual adjustments, balance ledger and request history.
- Annual, outpatient sick, hospitalisation, OIL, unpaid and other leave applications with attachment rules and no self-approval.
- Jasmine/assigned-manager approval queue, schedule-conflict context and an approved-leave calendar.
- Central approved-leave conflict check for new lessons and rescheduling paths already using teacher availability validation.
- Full-time payslip drafts with HR verification, finance confirmation, director approval, payment completion and protected PDF access.
- Employee self-service on teacher web and staff miniapp for balances, applications, cancellation, status history and released payslips.
- HR workspace assignment in existing user access management and finance-only payslip workflow access.

## Initial production data

- Legal entity: GT Educational Institute Pte. Ltd., UEN 202303312G.
- Jessika: full-time from 2026-08-10, manager Jasmine.
- Jasmine: full-time from 2026-06-01, director/HR approver.
- Sharilyn: full-time from 2026-06-01, finance, manager Jasmine.
- Leave entitlements remain zero until HR confirms signed contractual terms and grants the correct annual balances.

## Security and compatibility

- Existing financial, payroll, attendance, package and contract records are unchanged.
- Finance workspace cannot open general HR employee records; it can participate only in the payslip finance stage.
- Employees can view only their own HR self-service data and only released payslips.
- Identity and contract files are highly restricted and never self-served.
- Observer accounts remain read-only through existing observer mutation controls.

## Verification

- `npx prisma format`
- `npx prisma generate`
- `npx tsc --noEmit --pretty false`
- `npx tsx --test tests/hris.test.ts`
- `npm run build`
- `git diff --check`

## Production runbook

1. Deploy the additive Prisma migration with the guarded release script.
2. Run `npm run hr:bootstrap` once; the command is idempotent.
3. Configure confirmed leave entitlements in `/admin/hr` before granting balances.
4. Import inherited employee folders with `LEGACY_HR_SOURCE_DIR`, `LEGACY_HR_EMPLOYEE_EMAIL` and `npm run hr:import-legacy` from a private server staging location.
5. Verify `/admin/hr`, `/admin/hr/leave`, `/admin/hr/payslips`, `/teacher/hr` and the staff miniapp leave page.
