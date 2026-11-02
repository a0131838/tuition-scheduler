# SOP governance and operational authoring — 2026-11-02

## Objective

Make SGT operational SOP drafting available to Jasmine’s verified manager account, retain owner-only publication, track feedback and monthly reviews, and give staff accurate guides for recently changed workflows.

## Implementation

- Governance: `SopReview`, `SopFeedback`, `SopAuthorAccess` additive tables and audited actions. Managers and authorised authors can prepare operational drafts; only the owner can publish or withdraw. Owner UI can grant and revoke the narrow author capability.
- New uploaded versions sharing a topic are atomically archived/replaced on owner publication. Withdrawn built-in files and uploads redirect old links where the replacement is published, current, and accessible to the original readers. Progress/history remains intact.
- Live role-filtered inventory, status and review date, monthly queue and snapshot, staff feedback and manager resolution. Source fingerprinting uses explicit monitored paths and PDF bytes; it is a review trigger rather than proof of correctness. A Singapore-time cron saves the first-of-month inventory; management can export the CSV.
- Singapore model assists only with editable bilingual drafts, checklists and plain language from verified staff-supplied facts. Human screenshot checks and owner approval remain required.
- Six focused bilingual PDFs and maintainable HTML sources under `docs/SGT-*-20261102.html`. Screenshots were captured with Playwright using isolated role accounts and synthetic data, with controls marked. Areas: SOP management, parent reports, partner partial receipts, classrooms, teacher breaks and teacher calendar.
- Remaining work: the 35 earlier modules have not all been individually checked against every current page. They are visibly marked review-needed instead of being silently declared current, and broader historical guides are not replaced by narrower supplements. Staff can report precise discrepancies; prioritise owner review and remediation of those older modules.

## Verification

- `npx tsx --test tests/*.test.ts`: 821 passed, zero failed (see `/tmp/sgt-sop-tests-ship.log`).
- `npx tsc --noEmit`; `npm run build`; shell syntax of cron/deploy scripts.
- Isolated PostgreSQL + Playwright: author draft, submission, owner-only publication, same-topic replacement, archive, old-link redirect, review and feedback resolution; owner grants/revokes; role and origin denials. See `/tmp/sgt-sop-uat-result.json`, `/tmp/sgt-sop-admin.log`, `/tmp/sgt-sop-access.log`.
- Singapore model was called with fictional facts, both directly and through async HTTP; output persisted and could be edited (`/tmp/sgt-sop-ai-http.log`). No production student data was sent.
- All 34 pages of six generated PDFs checked for text/image presence and page bounds, and visually inspected as a rendered contact sheet.
- Before deployment, production read-only inspection identified two distinct Jasmine accounts. The manager account `12b028ee-b8ac-4e33-baaa-50ca0927e7eb` already holds manager ACL; the separate teacher account was not broadened.

## Deployment checks

Run standard guarded preflight and release. Verify local/GitHub/server commit equality, PM2 health, first monthly snapshot and cron installation. Use read-only account/ACL checks and anonymous endpoint checks; do not create or publish a real SOP without owner review.
