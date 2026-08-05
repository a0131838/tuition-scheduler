# TASK-20260805 Separate Full Care Contract Workspace

## Objective

Keep ordinary tuition contracts and Full Care agreements visibly and operationally separate while preserving the requirement that a Full Care customer signs one combined agreement covering the annual tuition package and care service.

## Delivered behavior

- The package contract page has explicit `普通合同` and `全托管合同` workspaces.
- Ordinary contract history, creation actions and editable fields exclude Full Care agreements and service terms.
- The Full Care workspace shows only Full Care drafts and history, its annual plan pricing, service scope and service boundaries.
- Draft creation checks contract identity. An open ordinary draft cannot be reused as Full Care, and an open Full Care draft cannot be reused as ordinary tuition.
- The Full Care project launch checklist routes to the dedicated workspace and selects a qualifying 100, 200 or 300-hour annual package.
- The Full Care details form is limited to two columns on desktop and one column on smaller screens.

## Data safety

- No existing contract, invoice, receipt, package balance or lesson record is modified by this release.
- Existing legacy Full Care snapshots remain classified through their saved `careServiceIncluded` identity.
- Staff must explicitly complete or void an open draft before creating a draft of the other contract type on the same package.

## Verification

- `npm run test:backend`: 166 passed.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run build`: passed for 240 application pages.
- Production verification is read-only on `赵测试`: compare the ordinary URL with the `?workspace=full-care` URL and confirm histories and controls remain isolated.
