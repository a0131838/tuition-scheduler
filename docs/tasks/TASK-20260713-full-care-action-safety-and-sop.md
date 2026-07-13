# TASK-20260713-full-care-action-safety-and-sop

## Context

The first full-care workspace was live and intentionally contained no pilot engagements. While producing the complete operator SOP with a temporary training project, Next.js development logs revealed that detail-page Server Actions captured a component-local redirect helper. The forms rendered, but the first real care submission could fail action serialization.

## Change

- Move the common care action redirect/error helper to module scope.
- Pass each care service Promise directly to the helper without changing service validation or persistence.
- Add a source-structure regression test that keeps the helper outside the page component.
- Produce a 20-page A4 landscape full-care SOP with real Playwright screenshots and red callouts.
- Record the first-version permissions, scope, evidence, risk, parent-summary, task, status, operating-rhythm, and current product-limit rules.

## Non-goals

- Do not change the database schema or migrate data.
- Do not create or activate any real pilot student.
- Do not add parent publication, formal monthly-report generation, attachments, or automatic alerts.
- Do not change scheduling, attendance deduction, packages, partner settlement, payroll, invoices, receipts, Business Accounts, or native-miniapp runtime behavior.

## Verification

- `npx tsc --noEmit`
- `npm run test:backend` passes 46/46.
- `npm run build` passes with 192 pages.
- Production-mode Playwright submits ACTIVE status, configuration, one plan, one HIGH/PARENT update, automatic linked task creation, and DONE completion evidence.
- Temporary training and action-verification data are cleaned to zero.
- SOP PDF has 20 A4 landscape pages, key text is extractable, and the rendered contact sheet has no blank, clipped, or overflow pages.

## Risk

Low and isolated. The runtime diff only changes the Server Action helper boundary. Existing care business rules remain unchanged, and the full-care module still has no write path into teaching or finance records.
