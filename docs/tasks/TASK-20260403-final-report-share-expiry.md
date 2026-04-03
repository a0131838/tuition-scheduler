# TASK-20260403-final-report-share-expiry

## 1) Request

- Request ID: `2026-04-03-final-report-share-expiry`
- Requested by: user follow-up to continue the next final-report enhancement without another approval stop
- Date: `2026-04-03`
- Original requirement: continue the final-report parent-delivery flow with the next most useful enhancement after manual delivery and share links were shipped.

## 2) Scope Control

- In scope:
  - add an expiry timestamp to final-report share links
  - let admin choose a share duration when creating or refreshing a link
  - show expiry state on the admin final-report center
  - reject expired tokens on the public final-report share page
  - release docs for this ship
- Out of scope:
  - automatic notifications
  - one-time links
  - parent portal account integration
  - final-report content changes
- Must keep unchanged:
  - final-report assignment rules
  - teacher fill / submit fields
  - delivery-record fields and semantics
  - attendance / package / finance logic

## 3) Findings

- Share links were already tokenized and revocable, but they did not yet have an expiry window, so operations needed a safer default for parent-facing access.
- The public share page already had a clean unavailable state, which made link-expiry support a low-risk extension.

## 4) Plan

1. Add `shareExpiresAt` to `FinalReport`.
2. Add 7 / 30 / 90 day duration choices on admin share actions.
3. Surface active vs expired share state on the admin final-report center.
4. Treat expired tokens as unavailable on the public read-only share page.

## 5) Changes Made

- Files changed:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403225500_add_final_report_share_expiry/migration.sql`
  - `lib/final-report.ts`
  - `app/admin/reports/final/page.tsx`
  - `app/final-report/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-report-share-expiry.md`
- Logic changed:
  - `FinalReport` now stores `shareExpiresAt`
  - admin can issue or refresh share links with 7 / 30 / 90 day validity
  - admin final-report center now distinguishes active vs expired share links
  - public share page rejects expired links
- Logic explicitly not changed:
  - no final-report teacher workflow change
  - no delivery-record change
  - no PDF content change
  - no midterm / attendance / package / finance logic change

## 6) Verification

- Build:
  - `npm run prisma:generate`
  - `npm run build`
- Runtime:
  - post-deploy startup check
  - production read-only QA on `/admin/reports/final`
  - production read-only QA on `/final-report/[id]?token=invalid`
- Key manual checks:
  - admin sees 7 / 30 / 90 day expiry choices
  - admin sees expiry timestamps on active links
  - invalid or expired public links show the unavailable state

## 7) Risks / Follow-up

- Known risks:
  - existing links without `shareExpiresAt` remain valid until refreshed or disabled, which is intentional to avoid breaking already-issued links
- Follow-up tasks:
  - if needed later, add forced expiry backfill for older share links
  - add one-time access or click audit logs if parent-delivery security needs to be tighter

## 8) Release Record

- Release ID: `2026-04-03-r23`
- Deploy time: pending deploy
- Rollback command/point: previous production commit before `2026-04-03-r23`
