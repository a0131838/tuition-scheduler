# TASK-20261104-renewal-progress-report

## Context

A same-package renewal/top-up raises both total and remaining hours. The final report's zero-balance gate can therefore miss the period when parents decide whether to renew. Jessika coordinates report assignments but is not automatically the student's teacher.

## Change

- Create one Renewal Progress Report per renewal follow-up task. The coordinator explicitly selects the teacher; assignment freezes the package and actual-attendance snapshot. The report survives later top-ups and risk resolution.
- Teacher saves a draft and submits observations on progress, strengths, specific lesson evidence, challenges, next steps, and an optional family note. Coordinator can return it with a reason.
- Reuse the parent-report AI translation, field validation, bilingual PDF and teacher/coordinator translation confirmation. The coordinator must approve a reviewed bilingual edition before formal family PDFs can be downloaded, then records the actual delivery channel and time.
- Show report state and delivery time in the renewal follow-up workbench. No automatic parent message, contract/payment gate, or change to the package ledger, midterm and final report rules.

## Jessika operation

1. Open `/admin/renewals` and review the student's risk and package. Use the “续费前学习进展报告” link; select the actual teaching teacher and assign once.
2. Ask the assigned teacher to open `/teacher/renewal-reports`, enter factual observations and a specific lesson example, save if needed, and submit. Jessika can return a submitted report with a reason if corrections are needed.
3. Open the report in `/admin/reports/renewal`. Generate the AI-assisted Chinese translation and parent summary, compare every paragraph with the teacher original, and confirm the translation. The teacher may do this review too, but Jessika still controls formal approval.
4. Preview the bilingual PDF, then click “核对中英 PDF 后批准”. Download the formal bilingual/Chinese/English PDF and send it to the parent through the normal communication channel. Mark the actual delivery channel only after sending.
5. The renewal task displays the report status and delivered time. Continue contract, invoice and package processing in the existing workflow. Do not wait for package balance to reach zero.

## Verification

- `npx prisma validate` and `npx prisma generate` with placeholder validation URLs.
- `npx tsx --test tests/renewal-progress-report.test.ts tests/learning-report-parent.test.ts tests/renewal-management.test.ts tests/renewal-auto-resolution.test.ts` (23/23).
- `npx tsc --noEmit --pretty false` and `npm run build`.
- Guarded release preflight and production health check after deployment.

## Risk

Medium: coordinators must choose the correct teacher and verify any historical attendance gaps before relying on the snapshot. AI translation needs configured regional service and human review. Rollback the application release without altering existing report or financial records.
