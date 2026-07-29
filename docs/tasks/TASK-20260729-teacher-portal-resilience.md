# TASK-20260729-teacher-portal-resilience

## Context

Production QA found four accounts whose primary role is `TEACHER` but whose `teacherId` is null. One affected account reproduced HTTP 500 on the teacher dashboard and 13 related pages because the shared teacher-profile guard returned `teacher: null` and downstream pages assumed a profile existed. The same audit also found slow first-use PDF transfer from the remote QA client, a narrow-screen `Apply` word break, a missing favicon, and login inputs outside a native form.

## Change

- Redirect every unlinked teacher account to a bilingual setup-required page instead of returning a nullable profile.
- Remove display-name auto-binding so the system never guesses a real teacher identity.
- Require an exact teacher-profile selection when a manager creates or edits a `TEACHER` account.
- Show one manager warning listing all current unlinked teacher accounts and mark those rows as teacher-portal locked.
- Add Content-Length, ETag, private one-hour caching, and 304 revalidation to protected training PDFs without changing role authorization.
- Keep mobile language action labels on one line.
- Use a native login form with username/current-password autocomplete and Enter-to-admin submission.
- Serve a branded `/favicon.ico` response and declare it in root metadata.
- Add regression coverage for the teacher guard, manager validation, PDF response contract, login semantics, mobile control, and favicon.

## Non-goals

- Do not choose, guess, or mutate the teacher profile for the four existing accounts.
- Do not disable or delete any user.
- Do not change training assignments or system permissions.
- Do not change billing, receipts, package balances, attendance deduction, payroll calculation, scheduling, Full Care records, or mini-program business workflows.
- Do not update unrelated dependency vulnerabilities as part of this scoped release.

## Verification

- `npx tsc --noEmit`
- `npm run test:backend` — 129 passed
- focused mini-program and training suite — 113 passed
- integrated final-base repository suite — 298 passed
- `npm run miniapp:audit-release` — 54 pages and zero errors
- `npm run build` — 231 static pages generated
- production checks for orphan/linked teacher access, manager warning, PDF 200/304 contract, mobile language control, native login form, favicon, PM2 health, and commit alignment

## Risk

Moderate. The teacher-profile guard intentionally removes a legacy name-based auto-link fallback. Existing correctly linked teachers are unchanged; unlinked teachers are safely blocked until a manager confirms the exact profile. PDF authorization and all operational business data remain unchanged.
