# TASK-20260331-upload-object-storage-hotfix

## Goal

Fix upload archive backups so the configured S3-compatible endpoint accepts the backup upload path used by the ops toolkit.

## Scope

- Update `ops/server/scripts/upload_object_storage_s3.sh`
- Switch the backup upload path away from the previous multipart `aws s3 cp` behavior
- Keep existing bucket/env contract unchanged

## Non-Goals

- No runtime upload flow change
- No object-storage migration for live business files
- No approval, receipt, or expense business rule change

## Files

- `ops/server/scripts/upload_object_storage_s3.sh`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `bash -n ops/server/scripts/upload_object_storage_s3.sh`
- manual backup archive upload succeeds without `MissingContentLength`

## Status

- Completed locally; ready for deploy.
