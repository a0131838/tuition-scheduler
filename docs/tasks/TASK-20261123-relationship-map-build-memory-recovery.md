# r522 — finish relationship map deployment and real PDF import

Date: 2026-11-23, Asia/Singapore

The user explicitly instructed continuing after the r521 failure: set the build process to 3 GB, finish formal deployment and PDF import, preserve uncertain identities/connections and verify the system before delivering its link.

## Root cause and smallest fix

r521 pushed/checked out commit 73a259b0, compiled, then its TypeScript worker exhausted the server default Node heap (1910 MB). SIGABRT stopped the guarded release before PM2 restart. The business PDF import was never executed. Login remained HTTP 200 under old PID 339184, but an old webpack runtime asset returned 400, so the system was not declared fully healthy. Server RAM is 3724 MB with 1987 MB swap.

Prefix only the deployment script's npm build command with NODE_OPTIONS containing --max-old-space-size=3072, preserving any pre-existing options and appending the explicit ceiling. Do not export it. PM2 restart runs after the command with its prior runtime environment. Keep all TypeScript checks; do not use ignoreBuildErrors or copy prebuilt artifacts. No database schema or business logic changes.

## Verification and execution

- bash syntax and child heap/parent environment isolation verification.
- r521 local full build, 185 backend and 13 focused tests, isolated concurrent import/audit rollback/new partner/project/new lead/edge/archive/restore acceptance and actual browser operations already passed.
- Run the standard guarded preflight and single release command. Require local/GitHub/server commit equality, PM2 PID and HTTP 200.
- After successful release, run scripts/import-gt-sales-network.ts in dry-run mode, then --apply only with the approved source hash. Use the existing owner administrator; no new login/user/test data on production.
- Import source: 30 nodes including owner / 29 people-and-institution nodes, 30 unconfirmed edges. Default 10 relationship profiles and four open cooperation projects; no student/lead creation, no inferred matches, no reclassification of old mixed leads. Matching source-hash retry reuses the existing map.
- Verify stored identities/counts/review flags, authenticated real-admin rendering where an active session exists, login/static assets, and no UAT nodes. Keep tokens and connection strings out of output.
- Release/import receipts under output/relationship-map-20261123 record actual outcome. Do not claim completion from a source checkout alone.

## Risks / recovery

The larger ceiling may still use server swap during checks; monitor the actual build. Only the build receives this override. Business import is transactional/audited and repeated-document idempotent. Application rollback must retain real imported profiles/projects for review rather than deleting business data.
