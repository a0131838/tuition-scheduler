# TASK-20260710-miniapp-staff-assisted-request-visibility

## Objective

Prevent staff-assisted parent requests from exposing internal WeChat-group original notes or screenshot attachments to parent miniapp views.

## Scope

- Updated parent-request DTO generation to parse staff-assisted request blocks:
  - `【对外摘要】`
  - `【员工代录原始摘要】`
  - `【沟通入口】`
- Parent miniapp responses now receive only the parent-facing summary as `content`.
- Parent miniapp responses hide staff-assisted attachment URLs, because those attachments may contain WeChat chat screenshots.
- Staff miniapp and admin ops responses pass `includeInternal`, preserving internal original notes, communication source, created-by marker, and attachments.
- Staff request detail now labels the public summary and internal original summary separately.
- Parent request detail no longer uses complex WXML fallback expressions.

## Business Rules

- The same Ticket remains the single work-order record.
- Audience determines projection:
  - Parent: public summary and simplified status only.
  - Staff/admin: public summary, internal original notes, communication source, uploader/creator marker, and attachments.
- Existing parent-created requests continue to show their normal content and attachments.

## Verification

- miniapp JS syntax and JSON parse checks passed.
- Parent/staff request-detail WXML complex-expression scan passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
