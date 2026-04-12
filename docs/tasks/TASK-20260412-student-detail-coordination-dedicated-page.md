# TASK-20260412-student-detail-coordination-dedicated-page

## Goal

Reduce clutter on the student detail page by moving the full scheduling-coordination workspace into its own dedicated student coordination page.

## Scope

- keep a lightweight coordination summary card on the main student detail page
- add a dedicated route for coordination: `/admin/students/[id]/coordination`
- reuse the existing coordination workspace on that dedicated route instead of rewriting the coordination logic
- point student-detail coordination entry buttons, helper forms, and ticket back-links at the dedicated coordination page

## Non-Goals

- no ticket lifecycle change
- no parent form or matching logic change
- no quick schedule rewrite
- no teacher availability, sessions, packages, deductions, or finance logic change

## Risks

- muscle memory risk: users who were used to scrolling one long page now need to enter the dedicated coordination workspace for full coordination actions
- navigation consistency risk: all coordination-related returns and helper forms must keep landing on the dedicated coordination page instead of falling back into the crowded main detail page

## Validation

- `npm run build`
- verify `/admin/students/[id]` shows a coordination summary card with an “open coordination workspace” entry
- verify `/admin/students/[id]/coordination` loads the full coordination workspace
- verify coordination ticket links and helper actions return to the dedicated coordination page after submit
