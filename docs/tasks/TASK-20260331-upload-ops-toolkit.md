# TASK-20260331-upload-ops-toolkit

## Goal

Add a minimal operational toolkit so upload files are easier to protect, audit, and monitor before disk pressure or missing-file incidents become business-facing.

## Scope

- Add a repo-level upload integrity audit script that checks upload-related database/app-setting records against local file presence.
- Add server scripts for:
  - upload integrity alert runs
  - disk usage checks
  - large-directory reporting
  - upload archive backup to S3-compatible object storage
- Add cron setup helpers for the new upload audit / backup / disk-monitoring jobs.
- Expose the integrity audit through `package.json`.

## Non-Goals

- No runtime upload flow changes
- No object-storage dual-write rollout
- No migration of existing uploads off local disk
- No approval, billing, or receipt business rule changes

## Files

- `scripts/audit-upload-integrity.ts`
- `ops/server/scripts/run_upload_integrity_with_alert.sh`
- `ops/server/scripts/setup_upload_integrity_cron.sh`
- `ops/server/scripts/check-disk-usage.sh`
- `ops/server/scripts/setup_disk_usage_cron.sh`
- `ops/server/scripts/report-large-dirs.sh`
- `ops/server/scripts/backup_uploads_to_object_storage.sh`
- `ops/server/scripts/setup_uploads_backup_cron.sh`
- `package.json`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run audit:upload-integrity`
- `bash ops/server/scripts/check-disk-usage.sh`
- `bash ops/server/scripts/report-large-dirs.sh`
- `npm run build`

## Deploy Notes

- After deploy, configure `/etc/tuition-scheduler/backup.env` with S3-compatible credentials if upload archive backups should run.
- Install the new cron jobs on the server:
  - `bash ops/server/scripts/setup_uploads_backup_cron.sh`
  - `bash ops/server/scripts/setup_upload_integrity_cron.sh`
  - `bash ops/server/scripts/setup_disk_usage_cron.sh`

## Status

- Completed locally; ready for deploy.
