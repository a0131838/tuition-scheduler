# Mini Program 1.1.01: 66 baseline verification and numbering correction

## Scope

User requested checking that 1.0.66 functionality was not lost and adopting version 1.1.01. This is a client-only development upload; do not submit review or publish. Formal web/backend remain r404 / 2849f552d957cf0a68cd69821d05db367167e1b6.

## Evidence

- Developer Tools upload log dated 2026-08-29 names version 1.0.66, project `/tmp/sgt-ticket-feedback-20260829/miniapp/boss-academic-parent`, description "员工AI工单：正式状态核验、完整操作清单与网络错误保护".
- Its project cache confirms version 1.0.66, successful upload timestamp 2026-08-29T04:39:07.745Z, 804843 bytes and 308 compiled files.
- The saved Git worktree registration for that path points to `7c684a31e2c3e0ae5aa45dd5bf308161a59a3b44`. That commit is an ancestor of the r404 worktree.
- Comparing that baseline with r404: 293 tracked Mini Program files before and after, zero deleted files, 287 byte-identical Git blobs. Only the coordination-detail JS/WXML/WXSS, session-detail JS/WXML and utils/config.js changed, matching the six intended r404 files.
- All 69 page registrations are retained. All 292 application-owned paths in the cached upload manifest exist locally. The other 16 entries are compiler-generated Babel runtime helpers, not missing application files.
- `pages/staff-ai-work/` and `lib/admin-ai-ticket-plan.ts` are identical to the 66 source baseline. The resolved-action guard, network retry protection and complete operation-list regression checks are retained.
- This checks source history and the cached upload manifest, not a byte-for-byte comparison against an archived WeChat binary. The old temporary source directory is no longer on disk; do not claim historical binary equivalence.

## Cause and prevention

The repository clientVersion remained 1.0.12 despite later CLI uploads numbered 1.0.65/66. r404 incorrectly incremented it to 1.0.13 and passed that number to the CLI. No production Mini Program replacement occurred.

Use `miniapp/boss-academic-parent/utils/config.js` as the version source. It now reads 1.1.01. Run `npm run miniapp:upload-test -- --check`, then `npm run miniapp:upload-test`. The wrapper does not accept an independent version argument, requires committed client source, runs the release audit, and records commit plus SHA-256 source manifest and a confirmed upload receipt.

Numbering: use 1.1.01 for this release candidate. The same accepted package keeps its number when designated for experience testing, reviewed, and published; do not increment just for changing distribution stages. When code changes again, use 1.1.02, 1.1.03, etc. New feature-series numbering requires an explicit release decision rather than automatically switching series.

## Verification and boundaries

Run release audit, syntax-check client JavaScript and upload wrapper, targeted AI/ticket regressions, native preview compilation, and development upload. Do not mark real-device employee acceptance complete from compilation alone. The experience build uses the production API, so real schedules, attendance, fees and messages must not be used as mutation tests.

No backend deployment is required for this version-only client correction. Retain r404 server commit and the existing production Mini Program; keep 1.0.13 out of review/publication.
