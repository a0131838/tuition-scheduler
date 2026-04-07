# TASK-20260407-final-report-pdf-gentle-parent-feedback-pass

## Goal

Adjust the parent-facing `Final Report` PDF so it reads as a gentle growth summary for families, highlighting progress, current gaps, and next-stage focus without sounding like a direct renewal push.

## Scope

- Update wording and section labels in `app/api/admin/final-reports/[id]/pdf/route.ts`
- Keep the PDF on one page
- Do not change the final-report form fields or stored data

## Changes

- Rename the top summary block to `Learning snapshot / 学习成长概览`
- Replace the stronger renewal-oriented narrative with a softer `Next learning focus / 下一阶段关注重点`
- Rephrase recommendation-based text as teacher observations and growth direction instead of an explicit continuation prompt
- Keep internal/admin-only metadata hidden from the parent-facing PDF

## Non-Goals

- No changes to teacher final-report forms
- No changes to admin assignment, delivery, share, exempt, or archive workflows
- No changes to package balances, attendance logic, or finance logic

## Verification

- `npm run build`
- Post-deploy startup check confirms `local / origin / server` alignment
- Downloading `/api/admin/final-reports/[id]/pdf` still returns `200 application/pdf`
