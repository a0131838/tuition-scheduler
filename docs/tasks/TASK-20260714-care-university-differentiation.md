# TASK-20260714-care-university-differentiation

## Context

University academic, postgraduate and career care were selectable programme names, but every programme reused the pre-university service scope and generic workflow. Adult-student consent and university academic position were not recorded.

## Change

- Add `POSTGRAD_PREPARATION` beside university academic management and career launch.
- Provide programme-specific scopes, defaults, owner roles and update categories.
- Preserve both pre-university default sets and every selected scope on an existing university project.
- Add an isolated university profile for institution, degree, term, graduation and GPA labels.
- Record adult-student consent and granular parent-visible sections.
- Block university parent-report eligibility until valid consent is recorded.
- Require an academic position before activating a university-stage project.

## Non-goals

- Do not build module/assessment, postgraduate application or job opportunity pipelines in this release.
- Do not publish university records to students or parents.
- Do not change existing care-project scope data automatically.
- Do not change students, lessons, attendance, packages, deductions, partner settlement, payroll, invoices, receipts or finance settings.

## Verification

- `npx prisma validate`
- `npx tsc --noEmit`
- `npm run test:backend` with 60 passing tests
- `npm run build` with 193 generated pages
- Production deployment at runtime commit `60d00d8`
- 104 completed migrations, PM2 online with zero restarts and `/admin/login` returning `200`
- Authenticated switching across all five programme types
- Existing NUS draft retained-scope display with stored scope unchanged
- University profile save, consent guard and authorized parent-eligibility path
- Desktop and 390px mobile layout checks without horizontal overflow
- Complete QA cleanup with protected baselines restored

## Risk

Medium but isolated to CARE configuration. The migration is additive, existing university scopes are retained visibly, pre-university defaults are locked by tests, and parent-report eligibility has an explicit adult-student consent guard.
