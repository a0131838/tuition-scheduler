# TASK-20261106-renewal-manager-guidance

## Context and verified cause

A configured manager saw the Step 1 Finance-account warning and interpreted it as a requirement to acquire Finance access before management approval. The warning was displayed to every non-Finance account even when Step 2 correctly exposed management controls. Read-only production checks confirmed that the existing Admin account predates this release, has management authorisation, and has no Finance authorisation. The reported request is REQUESTED, has no management approval or activation, and its package still has 30 minutes. The screenshot does not establish that a management button submission failed.

The isolated production-build browser walkthrough also reproduced a saved management approval with a stale REQUESTED page: PostgreSQL showed APPROVED, the action returned HTTP 303 with the correct result URL, but the browser kept the old status and approval controls for more than 30 seconds with no console error. This finding does not prove the same occurred for the reported production attempt. The fix follows the established final-report result-navigation pattern, loading the server-confirmed result as a complete document.

## Change

- Give managers status-specific guidance: awaiting Finance submission, ready for their review, requiring another manager for a self-request, or awaiting Finance activation after approval.
- Remove the Finance-account switching warning from configured managers. Keep Finance request/action controls restricted to authorised Finance accounts.
- Collapse the Finance request section for managers and add a direct management-review anchor. Preserve Finance's expanded request form and the existing review evidence.
- State the actual management result after approval or rejection. An approval message explicitly says that Finance must activate and that lesson hours have not yet been added.
- Load the management result with a validated same-origin URL scoped to the exact contract and route. Disable controls while saving, block repeat submission, and require a status check if the response is interrupted, since the save may already have succeeded.
- Allow the management buttons to wrap on narrow screens.

## Non-goals

No new account, role/approver configuration, database migration, receipt validation, management eligibility, activation rule, parent signature or package-ledger change. Do not approve or activate a real request for verification. Mini-program behaviour is unchanged.

## Verification

- `npm run build`.
- `npx tsx --test tests/renewal-signature-exception.test.ts`: three existing checks for immutable evidence, dedicated cash records and no double top-up after signing.
- Isolated PostgreSQL database with synthetic Finance and management accounts, using a production build. Verify pre-request guidance, Finance submission, management-only controls, collapsed Finance history, management review result and Finance activation handoff; inspect narrow-screen rendering, repeat clicks and interrupted-result recovery.
- Standard guarded release preflight/deploy; local, GitHub and server commit equality, PM2 and HTTP health.
- Production verification is read-only: check account role/authorisation and the reported request's status, activation and remaining minutes.

Local results: production build and all three focused checks passed. Browser checks confirmed the pre-request manager view, real synthetic Finance request submission, collapsed Finance history without a management-account warning, management approval with one POST for two rapid clicks and one complete-document result, Finance-only activation handoff, rejection validation/correction and a successful rejection result. Aborting the response after a saved approval displayed recovery guidance and disabled controls; reopening showed APPROVED. The final synthetic package remained at 30 minutes with no activation. The 390px management view had no horizontal overflow (374px content and scroll width). The only console failure was the intentionally aborted request.

## Risk and rollback

Low presentation risk. Existing server-side safeguards remain authoritative. Refresh existing browser pages after deployment. If guidance regresses, revert these UI/message changes to `ace275d013963ca817ec1fdf41d78b16e449ac4f` without changing any operational approval or payment records.
