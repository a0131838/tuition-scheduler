# TASK-20261030-jasmine-teaching-break-exemption

## User request

Owner explicitly instructed: Jasmine reports she can teach continuously, so the continuous-teaching/minimum-break policy must not apply to her; everyone else temporarily keeps the default. This supersedes r484's pending personal-limit decision.

## Investigation and boundary

Read-only production lookup found exactly one matching teacher: Jasmine, ID `aad58934-c4b3-4e30-b207-e7026af12f22`. No personal rule rows existed before this request. The original finite-limit model cannot represent an actual exemption, so using a large limit would be inaccurate.

Add an explicit Boolean defaulting false. The shared inspector and the database teaching-break function skip only this rule for a configured teacher ID. Other scheduling guards continue to run. Owner/manager-only writes keep reason, optimistic version checking, per-teacher lock and audit. The editor clearly shows Exempt when saved; its duration inputs are inactive while the exemption is selected.

## Verification

- 807 unit tests, including a continuous 17-hour example that passes only with explicit exemption; ordinary and explicitly nonexempt teachers still fail.
- Isolated PostgreSQL migration and resource UAT: ordinary four-hour / 15-minute boundaries; exempt Session and Appointment writes; retained room collision rejection for the exempt teacher; disabling exemption restores enforcement. Existing room race, teaching race, cancellation/restoration and feedback checks remain passing.
- Real authenticated HTTP UAT: teachers cannot enable exemption; authorized manager can enable and reverse it; invalid Boolean input rejected; stale-update protections retained.
- Production build and standard guarded release. No production lesson was created or altered for verification.

## Authorized production configuration

After successful deployment, execute the reviewed exact-ID configuration in the acceptance folder. It verifies the teacher's name is exactly Jasmine, requires the configured owner user, locks the teacher rule, upserts only her exemption, records the explicit owner authorization and audits before/after. Compare other rule rows unchanged in the same transaction. Read-only verification then confirms one exempt row, Jasmine, and default 240/15 for everyone without an override.

Evidence folder: `/Users/zhao111/Documents/sgt系统/交付文件/20261030-Jasmine授课规则豁免`.

## Rollback

Application baseline: `5180b21fc810e4210ffe083fe532c563a86bdf25`. To reverse only the exception, uncheck Exempt in Jasmine's teacher calendar, provide a reason and confirm. Keep audit history and the additive column. Reverting application code alone leaves the newer database guard in place; explicitly review the Boolean/function if rolling back the feature.
