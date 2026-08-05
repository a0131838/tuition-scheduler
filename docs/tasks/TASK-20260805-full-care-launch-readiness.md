# TASK — Full Care launch readiness and trust experience

## Objective

Complete the production Full Care journey for both audiences: parents must understand what they bought, what happens next and where progress appears; employees must see entitlement clearly and be protected from accidental status changes.

## Delivered

- Rebuilt the signed parent page as a bilingual branded service receipt with programme, tier, hours, fee split, total, savings, service period, reporting rhythm, next steps, support route and signed-PDF download.
- Added a seven-day post-sign public-access window and expiry checks for contract PDF tokens.
- Added an employee service-entitlement band with dates, contracted hours, used/remaining hours and days remaining.
- Removed default project/risk/coverage status transitions and added explicit bilingual choices.
- Added search, queue and overdue filters to the Full Care quality desk.
- Added a read-only current price catalogue to the contract workspace; it cannot create or alter business records.
- Added a narrow legacy review display path for already-active projects. It requires an audited exact contract ID, does not apply to drafts, and is not used by the new-project activation guard.

## Zhao Test2 safety boundary

- Care engagement: `b532d9cb-a393-4ed0-adde-56c02f2e7081`.
- Signed legacy contract: `cf9e051f-ea49-42c0-b8b2-558780085228`.
- Package: `8b107ba5-658a-4736-824e-2ae61039bd1c` (12,000 minutes).
- Invoice: `RGT-202608-0004`.
- The deployment must not rewrite any of those records. After production code is live, create only one idempotent `AuditLog` row whose meta identifies the exact contract and confirms the legacy Full Care content was reviewed.

## Verification

- TypeScript and focused automated tests.
- Full backend regression suite.
- Production build.
- Guarded release preflight and standard deployment script.
- Production read-only checks of the exact student, project, contract, package and invoice before and after the audit record.

## Rollback

Rollback code to `a582a11c1ed83da869ab4cc6623a02ba9e12edd0`. The one legacy review audit row is historical evidence and may remain; old code ignores it. No signed business record needs reversal.
