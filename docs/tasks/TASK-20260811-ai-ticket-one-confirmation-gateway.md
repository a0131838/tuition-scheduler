# TASK-20260811 AI 工单一次确认执行网关

## Scope

- Add a staff-miniapp AI work queue using the existing formal staff login.
- Delegate formal identity to the independent AI service with a five-minute signed token; no AI password is shared.
- Accept only versioned, allowlisted AI command packages.
- Re-run existing formal scheduling/cancellation/replacement validation before any write.
- Bind preview confirmation to the actor and the exact package payload.
- Complete the formal ticket and preserve the existing parent-visible result flow only after a successful transaction.
- Support monthly new-scheduling batches of up to 64 occurrences, including multiple teachers, in one Serializable transaction.
- Cover all ten workflows seen in the 518-ticket historical distribution. Low-frequency workflows create typed formal records: assessment/academic/service progress, parent intake for package purchase, or management correction review.
- Bind the package to the formal ticket `updatedAt`; any intervening change invalidates the prepared package.
- Prepare advisory output in the background so the employee sees only one final confirmation, not separate recognition/preparation buttons.
- Keep unavoidable business decisions on that same confirmation card: exact target lesson, charge/no-charge and reason for cancellation, and a formally qualified replacement teacher.
- Never substitute a course/package ID for a formal subject ID; ambiguous subject mappings remain blocked instead of producing an invalid scheduling command.

## Safety

- No direct AI database access.
- No raw SQL, generic field update, payment confirmation, payroll, contract/package activation, attendance override, or message-sending command.
- Package purchase creates the existing parent-intake/contract entry only. An existing linked student is updated rather than duplicated when that AI-created intake is submitted.
- Operation correction creates an Exception + management audit record; it cannot mutate arbitrary finance, attendance, lesson-package, or payroll fields.
- Mixed multi-command packages are rejected until their domain actions can share one transaction.
- Existing Tuition Scheduler routes and current production data are not changed during verification.

## Verification

- 7 focused execution/delegation/allowlist/final-card tests pass.
- New miniapp page JavaScript syntax passes.
- Full TypeScript and the 210-page production build pass after regenerating Prisma Client from the current schema; no login or schema source was changed for that repair.
- Docker Desktop 29.7.2 and Docker Compose v5.3.1 are installed on the Apple Silicon development Mac. The UAT database is an isolated local `postgres:15` container under Compose project `sgt_ai_uat`; it is not the production database.
- All 109 formal Prisma migrations were applied to the isolated database. `scripts/uat-ai-ticket-isolated.ts` refuses to run unless the database is exactly local `127.0.0.1:5432/tuition_db` and `AI_TICKET_UAT_CONFIRM=LOCAL_ISOLATED_DB` is explicit.
- Real Prisma-write UAT passed for: four-session batch scheduling, rescheduling, cancellation without deduction, cancellation with a 60-minute deduction, teacher replacement, assessment, package-parent-intake, academic, customer-service and controlled-correction workflows.
- The same run verified parent-visible results, one parent-intake record for the linked student, duplicate-click idempotency and 19 audit records.
- The UAT invokes the real formal HTTP route and verifies preview/apply, CS scheduling rejection (403), stale formal data rejection (409) and duplicate HTTP apply rejection (409).
- Focused tests, TypeScript, miniapp syntax and `git diff --check` passed again after the UAT runner and contextual final-confirmation fields were added.

## Employee operation impact

- Emily/customer service keeps using the original miniapp intake and can confirm service workflows only.
- Academic staff can handle assessment and academic workflows; formal timetable writes retain the existing ADMIN-only scheduling boundary.
- Finance can create the package parent-intake entry but cannot confirm payment or activate a package.
- Management correction remains ADMIN-only.

## Complexity check

- One miniapp entry, one selected ticket, one contextual button and one final confirmation modal.
- AI preparation, formal preview, stale-data detection and permission checks run behind that button.
- Missing evidence remains one blocker; technical command names, stages, tokens and idempotency keys are not shown to employees.

## Required runtime configuration

- `SGT_AI_BASE_URL`
- `SGT_AI_MINIAPP_SHARED_SECRET` (same value in both services, at least 32 characters)
- `AI_TICKET_EXECUTION_SECRET` (formal system only, at least 32 characters)

## UAT before release

Use isolated data for writes and production data only through the approved read-only connection. Verify timetable, package ledger, attendance, audit log, ticket status, parent-visible result, parent-intake link, existing-student reuse, stale-package rejection, duplicate-click rejection, unauthorized-role rejection and formal subject mapping. Do not run apply against a live customer ticket during engineering verification.

Local isolated evidence command:

```bash
AI_TICKET_UAT_CONFIRM=LOCAL_ISOLATED_DB \
DATABASE_URL='postgresql://tuition:tuition@127.0.0.1:5432/tuition_db?schema=public' \
DIRECT_DATABASE_URL='postgresql://tuition:tuition@127.0.0.1:5432/tuition_db?schema=public' \
npx tsx scripts/uat-ai-ticket-isolated.ts
```

Status: `LOCAL_DOCKER_UAT_PASS / PRODUCTION_READONLY_AUDIT_READY`. No real customer ticket received an apply call. WeChat physical-device confirmation remains a separate native-package gate.
