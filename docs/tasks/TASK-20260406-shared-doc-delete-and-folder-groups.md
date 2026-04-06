# TASK-20260406 Shared Doc Delete And Folder Groups

## Goal

Make the shared document library easier to manage by allowing real deletion and by surfacing category-based folder groupings more clearly on the admin page.

## Scope

- Add a real delete action on:
  - `app/admin/shared-docs/page.tsx`
- Delete the underlying file from whichever storage backend is in use:
  - S3 via `lib/shared-doc-storage.ts`
  - local uploads via `lib/business-file-storage.ts`
- Change new upload paths so category names become visible folder prefixes:
  - `lib/shared-doc-files.ts`
  - `lib/shared-docs.ts`
- Rework the shared-doc list UI so documents render in category sections with folder hints.

## Non-Goals

- No shared-doc permission changes
- No migration of existing shared-doc object keys
- No finance, payroll, attendance, or report logic changes
- No deletion support for other upload types in this task

## Output

- Admins can click `Delete / 删除` for a shared document
- The shared-document row is removed from the database
- The underlying stored object is removed from S3 or local storage
- New uploads store under category folder paths such as:
  - `shared-docs/finance/2026-04/...`
- The page shows category sections and folder hints so the grouping is obvious

## Validation

- `npm run build`
- open `/admin/shared-docs`
- confirm category sections and folder hints render
- confirm each row shows `Delete / 删除`
