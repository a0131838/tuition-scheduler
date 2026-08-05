# TASK-20260805-miniapp-gti-brand

## Context

The current Mini Program login experience displayed an old logo. The required artwork is `public/GTI2.png`, while the approved product name remains “博思学业管家”.

## Change

- Replaced the legacy login asset with the exact official `GT Educational Institute / 博思教育学院` transparent PNG from `public/GTI2.png`.
- Updated parent and staff login pages to reference the new asset.
- Strengthened the release audit so both login portals must reference the new logo asset.

## Non-goals

- Did not rename “博思学业管家”, “博思服务团队”, “博思员工” or the internal `BOSS_OTHER` operational cohort.
- Did not change authentication, permissions, lessons, Full Care, contracts, packages, invoices, receipts or scheduling data.
- Did not change the WeChat public-platform avatar, which is managed separately in the Mini Program account settings.

## Verification

- Run focused parent communication and Mini Program information-architecture tests.
- Validate all Mini Program JSON files.
- Run the Mini Program release audit and production build.
- Upload WeChat development version `1.0.27` and visually inspect both login portals.

## Risk

Low. The release changes brand assets and presentation copy only.
