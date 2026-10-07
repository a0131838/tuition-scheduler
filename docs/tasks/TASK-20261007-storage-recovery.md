# TASK-20261007-storage-recovery

User approved using the existing COS allowance without new purchases: preserve cloud history, remove only proven duplicate local backups, retain recent local backups and prevent silent full-disk failures.

## Implementation

- `verified_backup_retention.py`: exact archive-name scope, symlink exclusion, whole-inventory MD5/SHA256 verification, reject non-MD5/multipart ETags, optional missing-object upload, recheck cloud/local identity immediately before removal, keep newest seven per type. No cloud delete API exists.
- Backup jobs publish `.partial` output only after completion; local pruning runs after upload/verification. Remove the cloud cleanup invocation and unsafe age-only local database deletion. Failed jobs retain local backups and invoke alert checks.
- `storage_health.py`: 70/80/90 percent disk thresholds plus 5/2GiB free-space guards, 30h stale backup/cloud-verification checks, immediate job-failure alert, COS allowance threshold warning. Existing WeCom channel is loaded, HTTP/application response checked, retries remain possible on delivery failure. Cooldown 6h/1h/15min by severity, recovery notification, explicit test/dry-run.
- Mini Program screenshot endpoint returns actionable ZH/EN/BILINGUAL storage/size errors before changing evidence records.

## Verification

17 Python safety tests; 5 TS tests including real isolated screenshot read/write and preservation of an existing file; production build. Separate local/production operational evidence: `/Users/zhao111/Documents/sgt系统/交付文件/20261007-腾讯云容量与费用核查/执行证据`.

## Operational acceptance

After guarded deployment, install five-minute disk cron, verify webhook test acknowledgement, run real backup jobs (read production source; write backups only), check cloud/local counts and capacity. Do not create fake communication tasks or send parent reminders. A successful isolated upload roundtrip does not mean Emily has already resubmitted her real screenshot.

## Risks and boundaries

Cloud quota is shared with other usage: monitor tracks SGT backup-prefix bytes, and console total must also be reviewed. No unbounded storage can be free forever; warn before the existing allowance is exhausted. Latest restore was tested; historical backups were checksum-verified, not each separately restored. Existing disk snapshots keep their configured rotation. No new cloud resources or paid monitoring service are purchased.
