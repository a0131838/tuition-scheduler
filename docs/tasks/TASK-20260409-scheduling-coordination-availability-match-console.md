# TASK-20260409-scheduling-coordination-availability-match-console

## Goal

Make the admin scheduling coordination workflow easier to act on by surfacing teacher-availability-backed slot matches directly against the latest parent-submitted availability, without changing the actual scheduling execution flow.

## Scope

- filter generated candidate slots against submitted parent availability in the student coordination card
- show a new `Availability-backed result / availability 命中结果` section on the admin ticket detail page
- show matching slots when current teacher availability already satisfies the parent submission
- show nearest alternative slots when there is no exact parent-availability match
- keep copyable bilingual parent-facing wording on those result cards

## Non-Goals

- no change to `Quick Schedule` core execution logic
- no change to session creation, attendance, package math, or finance logic
- no change to ticket token generation or parent availability submission storage

## Files

- `app/admin/students/[id]/page.tsx`
- `app/admin/tickets/[id]/page.tsx`
- `lib/scheduling-coordination.ts`

## Acceptance

- submitted parent availability should narrow the generated slot list on student detail
- admin ticket detail should show a direct availability result block instead of forcing ops to recompute matches mentally
- matching slots should expose `Copy Message`
- no-match cases should expose fallback alternatives with `Copy Alternative`
- build and deploy should complete without affecting existing coordination, quick-schedule, or finance flows
