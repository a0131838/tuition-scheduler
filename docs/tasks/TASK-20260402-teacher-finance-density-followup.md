# TASK-20260402 Teacher Finance Density Follow-up

## Goal

Reduce first-screen density on the teacher finance pages after the teacher-portal QA pass, especially in bilingual mode on normal laptop screens.

## Scope

- `app/teacher/expense-claims/page.tsx`
- `app/teacher/payroll/page.tsx`
- release documentation updates for the same ship

## Changes

1. Teacher expense claims
- keep the top summary cards
- add action-first cards for rejected claims, approved-unpaid claims, and new claim creation
- move the new expense-claim form into a lighter disclosure block
- move the full submitted-claims table and filters into a disclosure block that opens automatically only when filters are active

2. Teacher payroll
- keep the current-stage and current-owner summary visible at the top
- remove repeated sent/confirmed status text blocks
- keep the confirmation action close to the current-status card
- move cycle notes and detailed payroll calculations into lighter disclosure blocks

## Non-goals

- no payroll calculation changes
- no payroll workflow or approval-rule changes
- no expense-claim submission, resubmission, or withdrawal logic changes

## Validation

- `npm run build`
- manual teacher-side QA for:
  - `/teacher/expense-claims`
  - `/teacher/payroll`
- confirm the first screen is easier to scan in bilingual mode

## Release notes

- Release ID: `2026-04-02-r01`
- Risk: low
- Rollback: revert this release if teachers report missing actions or hidden history confusion
