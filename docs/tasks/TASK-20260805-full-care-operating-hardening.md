# TASK — Full Care operating hardening

## Goal

Make the launch safe and understandable from the parent, employee, finance and management viewpoints while preserving existing signed records and real teaching data.

## Implemented controls

- Added a dedicated `FULL_CARE_AGREEMENT` contract mode. A draft automatically switches to that mode when the Full Care commercial details are saved; legacy signed Full Care records also display the correct agreement name without rewriting their snapshot.
- Kept the contract entry in `课包 → 课包合同工作台`, because the signed agreement covers both the annual lesson package and the care service in one document.
- Required explicit service hours, routine and urgent response targets, included on-site capacity, refund calculation and a legal/tax/PDPA approval reference before a new sign link can be generated.
- Added incomplete-launch configuration alerts and 60-day expiry/renewal alerts to the quality desk.
- Required an end date in project configuration and created the first report due date when a project is activated or repaired.
- Added a visible sparse-evidence warning to monthly reports.
- Added service-minute capture to every care update so managers can assess employee workload and delivery cost.
- Expanded the default backend test command to include all five previously omitted Full Care contract and launch suites.
- Updated patch-safe dependencies and overrides, reducing the dependency audit from ten findings to two high findings contained in Next.js 15's nested image dependency.

## Authorized test-data cleanup

- Removed only Wang Jia Yi / Louis's Full Care test engagement from production.
- Preserved the student, course package, enrolments, attendances, sessions, contracts and parent links.
- Backup: `/home/ubuntu/backups/full-care-cleanup-20260805/wang-louis-care-project-backup.json`
- Backup SHA-256: `f6502213ea5eb35640aef5fc18ab6e7c54439dc6f74edf2fe3577362899a197f`
- Audit event: `DELETE_TEST_CARE_PROJECT`, audit id `3d9306fd-1b78-4f29-8e30-2e414c18ba96`.

## Verification

- Focused Full Care test suite.
- TypeScript validation and production build.
- Migration preflight and standard guarded release.
- Post-deploy employee, manager, finance and parent journey on `赵测试2`; no real student records may be changed during E2E.

## Remaining boundary

The remaining two high dependency findings require a Next.js 16 compatibility upgrade. Do not use an automatic force upgrade in this release.

## Rollback

Revert the r325 release commit and redeploy r324. Database changes are additive; leave the enum value and zero-default service-minute column in place during application rollback.
