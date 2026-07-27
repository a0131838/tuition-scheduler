# TASK-20260727 School Guide Copy Simplification

## Goal

Make the public School Guide feel like a concise decision tool instead of an internal process document.

## Changes

- Remove employee names and internal workflow language from public UI.
- Cut repeated official-source, review, disclaimer and publication-process explanations.
- Remove the decorative homepage compass and internal IB source-page filter.
- Keep only action, decision facts, necessary risk notices and privacy contact channels.
- Apply the same copy hierarchy to web and WeChat miniapp.

## Non-scope

- School data, matching rules, inquiry assignment, permissions, authentication and business workflows.
- Database schema or production data.

## Acceptance

- No employee name or internal owner/review language remains in School Guide UI.
- Mobile first screen reaches the main actions without a large decorative block.
- Build, focused tests and miniapp audit pass.

## Completion

- Status: complete and live on `2026-07-27`.
- Runtime commit: `0c2c431f8cb65f3d5741f18eae14f83a0800b3da`.
- Production: PM2 PID `1492457`; five School Guide routes and API checks returned HTTP 200.
- WeChat: development version `1.0.19` uploaded successfully at 573,860 bytes.
- Regression: 225-page build, 10 focused tests, all 270 repository tests, 54-page miniapp audit, diff check and mobile visual review passed.
