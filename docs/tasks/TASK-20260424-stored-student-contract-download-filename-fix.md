# TASK-20260424 Stored Student Contract Download Filename Fix

## Goal

Keep signed student-contract downloads on the same business-friendly filename pattern even when the PDF is served from stored contract files instead of being regenerated on the fly.

## Problem

The previous `r115` filename improvement covered regenerated contract PDFs, but already-stored signed PDFs still passed an ASCII fallback filename into `buildStoredBusinessFileResponse(...)`. As a result, some downloads still appeared as internal-style names such as `_2-HOURS-contract.pdf`.

## Scope

- Use the business-readable `downloadName` for stored signed contract responses.
- Keep inline preview responses aligned to the same UTF-8 filename logic.
- Do not change contract content, signing flow, invoice generation, or permissions.

## Files

- `app/api/exports/student-contract/[id]/route.ts`
- `lib/business-file-storage.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- verify the stored signed-contract branch now passes the business filename instead of the ASCII fallback
- verify `Content-Disposition` uses the same UTF-8 filename logic for download and inline responses
