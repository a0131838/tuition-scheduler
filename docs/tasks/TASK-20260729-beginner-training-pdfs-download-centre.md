# TASK-20260729-beginner-training-pdfs-download-centre

## Context

The training centre had complete role coverage, but 17 of the 23 bilingual PDFs were fixed four-page summaries. They explained the workflow at a high level but did not give a zero-experience employee enough instruction to work one screen and one checkpoint at a time. Staff could open a PDF from an expanded training module, but there was no permanent central download library.

## Change

- Rebuild the 17 short bilingual PDFs as nine-page beginner guides.
- Add a preparation page that explains account, workspace, training-data, source-data, and stop rules.
- Keep the full workflow overview, then place every key action on its own page.
- Pair each key action with an existing real annotated system screenshot.
- Explain page confirmation, target-record confirmation, the required action, before-save review, after-save verification, and stop/escalation conditions.
- Add a final self-check and evidence checklist.
- Keep the six existing detailed bilingual guides.
- Raise the training release version to `20260729`.
- Add `/training/library`, showing only PDFs assigned through the employee's primary or additional training roles.
- Add View PDF and Download PDF actions in both `/training` and `/training/library`.
- Make explicit downloads return `Content-Disposition: attachment`; normal viewing remains `inline`.

## Non-goals

- Do not grant system permissions from training roles.
- Do not expose PDFs to unauthenticated users, students, or employees without the relevant training role.
- Do not create or complete training progress when a PDF is viewed or downloaded.
- Do not change scheduling, attendance, packages, contracts, finance, payroll, settlement, Full Care, or parent-visible records.

## Verification

- All 23 assigned PDFs exist and contain at least eight pages.
- All 23 PDFs passed Chinese-text, English-text, file-size, and per-page content checks.
- Total controlled training content: 251 PDF pages.
- The representative Scheduling beginner guide rendered as nine pages; its contact sheet showed no blank, clipped, or overlapping pages.
- The authenticated PDF Download Centre returned HTTP 200 and displayed 20 modules available to the administrator training role combination.
- Normal PDF view returned `Content-Disposition: inline`.
- Explicit PDF download returned `Content-Disposition: attachment` and a valid `%PDF` file signature.
- An administrator without the Teacher training role received HTTP 403 for a teacher-only module.
- The temporary authenticated verification session was deleted; remaining matching sessions: 0.
- All 118 backend tests passed.
- TypeScript passed.
- The complete 229-page production build passed.

## Risk

Low. The release adds a read-only catalogue and larger static PDF artifacts. Access control reuses the existing module-role check. The only response change is attachment disposition for an explicit download query. No operational data is mutated.
