# TASK-20260728-training-map-build-packaging

## Context

The first r290 server build type-checked the TypeScript PDF generator. Production intentionally does not install Playwright, so the build stopped before PM2 restart even though the application code and existing process were healthy.

## Change

- Rename the optional documentation generator from `.ts` to `.mjs`.
- Keep execution through `tsx` so it can still import the typed operation-coverage registry when maintainers regenerate the PDF.
- Exclude the optional Playwright import from the Next.js TypeScript application build.

## Non-goals

- No runtime training behavior, role assignment, permission, schema or business workflow changes.
- No manual server workaround or deployment bypass.

## Verification

- The 228-page Next.js production build passes.
- Standard guarded release preflight and deployment remain required.

## Risk

Low and limited to maintainers regenerating the operation-map PDF. The committed HTML and PDF artifacts are unchanged.
