# TASK-20260717 Miniapp Parent Reassurance Dashboard

Release candidate: `2026-07-17-r259`

## Objective

Turn the parent miniapp from a collection of operational entries into a calm, permission-aware reassurance dashboard, with service progress and reviewed Full Care reports easy to find.

## Scope

- Record the complete long-term miniapp product direction in a dedicated planning document and the existing miniapp master document.
- Change the native parent tab bar to `Home / Service / Schedule / Finance / My` without adding a custom tab bar.
- Make Home lead with parent-facing status, weekly service, next step, parent action, latest report and learning details.
- Translate internal risk levels into action-aware parent copy and format lesson balances as hours and minutes.
- Make Service a primary destination for all linked parents while preserving every relationship permission.
- Add latest-report acknowledgement state to the existing read-only service-progress projection.
- Reorder report detail around conclusion, completed actions and next steps; keep PDF, acknowledgement and report questions intact.
- Keep student switching, binding and logout in My; keep service requests reachable from Home and Service.

## Permission And Compatibility Boundaries

- A linked parent without `canViewReports` can use the Service tab but cannot load Care engagements, reports, internal academic next actions or advisor ownership.
- Schedule, feedback, finance and request reads remain gated by their existing relationship permissions.
- Care data remains limited to active engagements, published parent-audience activities, parent-visible tasks and parent-accessible published reports.
- No database migration or new write route is introduced.
- Scheduling, attendance, package ledgers, finance, payroll and partner settlement are unchanged.
- Existing report publish, revoke, PDF, acknowledgement and question state transitions remain unchanged.

## Verification

- [x] All native miniapp JavaScript syntax checks.
- [x] 30-page miniapp release audit.
- [x] 12 focused login, permission, presentation, stale-response and service-progress tests.
- [x] 40 complete miniapp and WeChat subscription tests.
- [x] 79 backend tests.
- [x] TypeScript.
- [x] 194-page production build.
- [x] Read-only production-schema acknowledgement projection check.
- [ ] WeChat Developer Tools and physical-phone visual pass after uploading the next experience version; the tool is not installed in the current Codex runtime.

## Rollout

The server API and native miniapp source are live at runtime commit `931edbd`. This does not by itself publish a new WeChat experience or formal version. Upload the next experience version before family rollout.

## Follow-up

1. Confirm official WeChat templates for report publication, parent action due dates and significant results.
2. Build those three notifications as a separate consent-aware release.
3. Build a separate staff Full Care mobile queue and only then add audited activity, attachment and task writes.
