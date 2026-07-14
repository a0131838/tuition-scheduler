# TASK-20260714-care-evidence-attachments

## Context

The first full-care workspace can record facts, judgement, actions, outcomes and tasks, but staff could not attach the school emails, notices, reports or coordination documents that prove delivery. Formal monthly reporting should not be built on unsupported summaries.

## Change

- Add a private `CareAttachment` model and controlled attachment categories.
- Store evidence under an isolated CARE S3/local path with a 25MB limit and an allowlist of document, email and image types.
- Require current care-project access for upload, view and download.
- Allow each attachment to link to one follow-up and one task from the same project.
- Separate internal-only evidence from evidence eligible for a later reviewed parent report.
- Add archive/restore with optimistic locking and audit logs; files are not physically removed by normal archive actions.
- Add communication source type and source detail to full-care follow-up records.

## Non-goals

- Do not publish attachments or draft summaries to parents.
- Do not add monthly-report generation or notifications in this release.
- Do not change lessons, attendance, packages, deductions, partner settlement, payroll, invoices, receipts or finance settings.

## Verification

- `npx prisma validate`
- `npx tsc --noEmit`
- `npm run test:backend` with 53 passing tests
- `npm run build` with 193 generated pages
- Production-mode browser flow: upload, activity association, authorized signed download, archive and restore
- Unauthenticated download returned `401`
- Temporary QA student, session, project, attachment, audit rows and S3 object cleaned to zero

## Risk

Medium and privacy-sensitive but isolated. The main risk is accidental evidence exposure, controlled by project-level authorization on every route, private storage paths, restricted file types and no parent API in this release.
