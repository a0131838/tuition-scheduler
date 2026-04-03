# TASK-20260403 Teacher Payroll Bilingual Duplication Hotfix

## Goal

Remove duplicated bilingual labels on the teacher payroll page where some strings were being manually written as `EN / ZH` and then passed through the bilingual helper again.

## Scope

- `app/teacher/payroll/page.tsx`
- release documentation updates for the same ship

## Changes

1. Fix duplicated bilingual labels
- convert repeated payroll stage, owner, action, and timeline labels back to normal `t(lang, en, zh)` usage
- remove duplicated bilingual output such as:
  - `接下来做什么 / What happens next / 接下来做什么 / What happens next`
  - `Finance payout / 财务发薪 / 财务发薪 / Finance payout`
  - similar repeated stage and timeline labels

2. Keep payroll behavior unchanged
- do not change payroll calculation
- do not change teacher confirm logic
- do not change approval or payout logic

## Non-goals

- no payroll workflow changes
- no finance-return logic changes
- no layout redesign beyond fixing duplicated labels

## Validation

- `npm run build`
- local source audit confirmed the duplicated `t(lang, "EN / ZH", "ZH / EN")` labels were replaced with standard `t(lang, "EN", "ZH")`
- the current local and production teacher account still lands on the payroll empty state for this month, so the validation focused on code-path cleanup plus build verification rather than a live sent-payroll record

## Release notes

- Release ID: `2026-04-03-r02`
- Risk: low
- Rollback: revert this release if any teacher payroll status labels disappear, render in the wrong language, or stop matching the existing payroll workflow states
