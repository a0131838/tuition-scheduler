# TASK-20260729-training-completeness-and-miniapp-binding

## Objective

Repair incomplete or misleading staff training, add a complete parent and employee mini-program binding workflow, and ensure every downloadable bilingual PDF matches actual routes and role capabilities.

## Scope

- Correct the parent invite route from `/pages/bind/index` to the registered `/pages/bind/bind`.
- Add a standalone Academic-to-parent binding module.
- Expand staff binding into manager code issue plus employee self-binding.
- Rebuild Sales, Finance, Full Care, and Parent/Student Support mini-program guides with workflow-specific evidence.
- State unavailable native mobile capabilities honestly and route those tasks to the correct web workbench.
- Raise the controlled release from 28 modules / 296 pages to 29 modules / 305 pages.
- Add screenshot existence, workflow-evidence, route-registration, access-control, and PDF checks.

## HR completion standard

Every module remains complete only after:

1. the employee reads the current bilingual SOP;
2. the role quiz reaches at least 80%;
3. the employee practises with training data and records the verified final state;
4. a manager signs off against the four-item competency rubric.

## Functional boundaries found

- Finance has employee mini-program login/binding but no dedicated native Finance approvals, payroll, or claims workspace.
- Full Care has general student and request support in the mini program but no native Full Care task, risk-editing, or report-publishing workspace.
- These are documented as product recommendations, not presented as existing operations.

## Verification target

- 29/29 assigned bilingual PDFs exist and are downloadable.
- 305 controlled PDF pages.
- All referenced screenshots exist and render.
- Parent invite path matches `miniapp/boss-academic-parent/app.json`.
- Role access includes CS/ADMIN for parent binding and excludes unrelated roles.
- TypeScript, backend tests, production build, deployment, authenticated training pages, and PDF download all pass.

## Verification completed before deploy

- `npm run test:backend`: 122/122 passed.
- `node_modules/.bin/tsc --noEmit`: passed.
- `npm run build`: passed, 229 pages.
- Training registry: 29 modules, 305 PDF pages, 26 ADMIN-accessible modules, 9 mini-program modules.
- Render checks: parent binding step, Finance boundary step, and the complete four-column catalogue passed without blank images, clipping, or missing modules.
- Automated completeness checks:
  - every generated HTML screenshot path exists;
  - workflow-specific binding screenshots are used;
  - unsupported Finance and Full Care native capabilities are stated explicitly;
  - all 198 visible routes remain mapped;
  - parent invite route matches `pages/bind/bind` in the mini-program registry.

## Risk

Low to moderate. The route correction changes an unusable parent path to the existing registered bind page. Training changes reset the current content version to `20260729B`; they do not grant operational permissions or mutate business records.
