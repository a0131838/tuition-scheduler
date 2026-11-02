# TASK-20261102-refresh-28-sops

## Context

The 35 built-in SGT Manage training modules included 28 legacy PDF guides that had not yet been individually refreshed. Staff reported obsolete controls, mismatched screenshots and language that was difficult to follow. Seven other guides had already received partial corrections in earlier releases.

## Change

- Replace the remaining 28 guides with bilingual, role-specific HTML sources and printable PDFs dated 2026-11-02. Nineteen cover web workflows and nine cover the mini program. The screenshots were captured from the current UI using synthetic local training accounts, with visible callouts and practical checks.
- Route the 28 training catalogue entries to the new PDFs. The seven previously corrected entries also retain their 2026-11-02 PDF paths. Earlier PDF files remain in the repository for audit, but staff-facing catalogue links use the updated files.
- Preserve every module's existing assessment version and historical completion records. The training-management view now reads all active module versions so the existing scheduling-module completion can be counted correctly.
- Correct the academic mini-program, sales mini-program and teacher availability practice text to match the current workflows.

## Verification

- `python3 tmp/sop-audit-20261102/verify-28-guides.py`: 28 HTML/PDF pairs, bilingual step parity, image references, page fit, readable content and no blank pages; zero structural errors. This audit script was run locally and is not shipped.
- `npx tsx --test tests/training-center.test.ts`: training catalogue, role mapping and guide-path checks.
- `npm run build`: production build.
- Local browser walkthroughs used an isolated PostgreSQL test database and synthetic records. Mini-program screenshots were captured from a logged-in WeChat DevTools simulator via Playwright. No production student, finance or payroll records were used.

## Risk and follow-up

The manuals are updated, but the governance catalogue must retain its review-needed state until an authorised owner signs off a live walkthrough. Screenshots show representative training states; staff should submit feedback for any role-specific difference they encounter. This release changes guide content and catalogue routing, not business transaction logic or assessment history.

## Rollback

Revert this release commit to restore the previous catalogue paths. Preserve historical training and SOP records and the new PDFs for audit.
