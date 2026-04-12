# TASK-20260412-student-coordination-close-button

## Goal

Make the dedicated student coordination workspace easy to leave by adding a clear close/return action back to the main student detail page.

## Scope

- keep the dedicated coordination page
- when already inside that page, change the workbench link from “open scheduling coordination” to a close/return action
- expose the same close action in the dedicated coordination page header
- keep the destination as the main student detail page for that student

## Non-Goals

- no coordination logic change
- no ticket lifecycle change
- no candidate generation change
- no parent form or matching logic change
- no quick schedule, sessions, packages, deductions, or finance change

## Risks

- navigation wording risk: the close action must be clearly different from the normal “open coordination” entry to avoid confusion
- return-path risk: the close action must always land on the correct student detail page

## Validation

- `npm run build`
- verify `/admin/students/[id]/coordination` shows a visible `Close coordination workspace / 关闭排课协调工作台` action
- verify clicking that action returns to `/admin/students/[id]`
- verify the main student page still shows the normal `Scheduling coordination / 排课协调` entry when not inside the dedicated workspace
