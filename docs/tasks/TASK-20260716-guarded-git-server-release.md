# TASK-20260716-guarded-git-server-release

## Context

The Finance Documents release was committed locally but repeated HTTPS GitHub fetch/push attempts timed out or returned `curl 52 Empty reply from server`. The server deploy could not begin because the production branch had not reached GitHub, while the existing `quick_deploy.sh` covered only the server half of the release. This made it too easy to confuse committed, pushed, and deployed states.

## Change

- Add `release_to_server.sh` as the normal production release entry.
- Require the Git remote to use the dedicated GitHub SSH identity through `ssh.github.com:443`.
- Reject tracked working-tree changes, missing release docs, failed GitHub authentication, and non-fast-forward production history before push.
- Push local HEAD to the configured production branch and verify GitHub returns the exact local commit.
- Call the existing server deployment primitive only after GitHub verification.
- Verify the server commit matches local/GitHub, PM2 has a live PID, and the configured health URL returns HTTP 200.
- Add `--check` for a read-only preflight and reuse the main worktree's ignored handoff config when running from a clean Git worktree.
- Update the server handoff, production command template, release board, changelog, and persistent SGT deployment skill.

## Non-goals

- Do not change application behavior, dependencies, database schema, environment values, or business records.
- Do not automate GitHub account key creation or weaken release-document checks.
- Do not add direct file-copy, rsync, force-push, or release-gate bypass fallbacks.

## Verification

- Validate both release shell scripts with `bash -n`.
- Run `release_to_server.sh --check` after committing to prove SSH 443, GitHub identity, release documents, and branch ancestry.
- Publish this release through `release_to_server.sh` itself.
- Confirm the final output reports one matching local/GitHub/server commit, a valid PM2 PID, and HTTP 200.

## Risk

Low and operational. A false-positive release is prevented by explicit commit comparison and health checks. A failed prerequisite stops the release before push or deployment; a server failure after a successful GitHub push remains visible and does not silently report completion.
