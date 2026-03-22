# TASK-20260322-context-control

## 1) Request

- Request ID: `TASK-20260322-context-control`
- Requested by: Zhao
- Date: `2026-03-22`
- Original requirement: New chat windows keep forgetting history; need a stable process and command pattern first.

## 2) Scope Control

- In scope: Build persistent handoff docs and reusable command templates.
- Out of scope: Any business logic, any page behavior changes, any DB schema changes.
- Must keep unchanged: Existing feature behavior.

## 3) Findings (Read-only Phase)

- Root cause: Conversation context is not guaranteed across new windows; no mandatory "read project memory docs first" workflow.
- Affected modules: Process and release operations (not runtime business logic).
- Impact level: High operational risk, medium product risk.

## 4) Plan (Before Edit)

1. Create single source of truth changelog.
2. Create release board snapshot doc.
3. Create task template + start-command template.
4. Update opening prompt shortcut file.

## 5) Changes Made

- Files changed:
  - `docs/CHANGELOG-LIVE.md` (new)
  - `docs/RELEASE-BOARD.md` (new)
  - `docs/tasks/TASK-TEMPLATE.md` (new)
  - `docs/tasks/TASK-20260322-context-control.md` (new)
  - `docs/NEW-CHAT-COMMANDS.md` (new)
  - `docs/CODEX-新对话开场白.txt` (updated)
- Logic changed: None.
- Logic explicitly not changed: All product/runtime/business logic.

## 6) Verification

- Build: Not required (docs-only change).
- Runtime: No runtime files changed.
- Key manual checks: New docs exist and are readable.

## 7) Risks / Follow-up

- Known risks: Release board values must be maintained after every deployment.
- Follow-up tasks:
  - Add "release ID" to admin footer/header.
  - Review whether to enforce gate on commit range (instead of HEAD commit only) in future.

## 8) Release Record

- Release ID: `process-only-2026-03-22`
- Deploy time: Not deployed (documentation only).
- Rollback command/point: Revert these docs if needed.

## 9) Added After Initial Draft

- Added deploy-time doc gate:
  - `ops/server/scripts/verify_release_docs.sh`
  - `ops/server/scripts/deploy_app.sh` (gate + emergency bypass switch)
  - `.github/workflows/deploy-server.yml` (pre-ssh gate)
  - `ops/server/.deploy.env.example` (`SKIP_RELEASE_DOC_CHECK` variable)

## 10) Added Server Handoff Baseline

- Added fixed server handoff document and startup rule:
  - `docs/SERVER-HANDOFF.md`
  - `docs/NEW-CHAT-COMMANDS.md` (now includes SERVER-HANDOFF)
  - `docs/CODEX-新对话开场白.txt` (now includes SERVER-HANDOFF)
- Added local server config template + one-command scripts:
  - `ops/server/server-handoff.env.example`
  - `ops/server/scripts/quick_check.sh`
  - `ops/server/scripts/quick_deploy.sh`
- Added gitignore safeguard:
  - `.gitignore` includes `ops/server/server-handoff.env`

## 11) Added High-Risk Ops Hardening

- Added high-risk checklist doc:
  - `docs/HIGH-RISK-AREAS.md`
- Unified dangerous-op warnings in key docs:
  - `docs/运维手册.md`
  - `docs/GitHub-Actions部署说明.md`
  - `docs/CODEX-生产发布指挥模板.md`
  - `docs/自有服务器部署指南.md`
  - `docs/SERVER-HANDOFF.md`
- Added forced confirmation gate for Neon overwrite script:
  - `ops/server/scripts/sync_local_db_to_neon.sh`

## 12) Build Hotfix Follow-up

- During deployment, `release-doc gate` correctly blocked a commit that only changed `lib/date-only.ts`.
- Added this entry + changelog + release board update to make hotfix deploy traceable and gate-compliant.

## 13) Quick Script Path Fix

- Found and fixed local path resolution issue in:
  - `ops/server/scripts/quick_check.sh`
  - `ops/server/scripts/quick_deploy.sh`
- Impact: deploy already succeeded; this fix prevents false failure in the final "run quick check" step.
