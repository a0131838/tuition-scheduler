# TASK-20261102-training-practical-submission

## Request and root cause

Finance reported a server exception after submitting Web System Training → First Purchase, Renewal, Contracts, Packages, and Finance Gates. The owner requested investigation and then explicitly requested the fix.

Production PM2 logs show `Training module not available` inside `submitTrainingPractical`, digest `1194006139`, repeated four times. Reading and quiz forms include moduleCode, but the practical form did not. The action therefore received an empty module identifier and failed before any progress update. FINANCE is allowed this module by the existing access policy.

## Minimal fix

- `app/training/TrainingPracticalForm.tsx`: module-bound hidden identifier, native server-action fallback, inline hydrated submission result, pending disable and retained entries on failed validation. The client intercepts submit rather than returning from a form action, so failed requests do not reset uncontrolled fields.
- `app/training/page.tsx`: wrap only the practical-evidence form in this component and pass the current module code. Other fields and steps remain unchanged.
- `app/training/actions.ts`: add a safe practical-only wrapper around the existing validated write. Known authorization/prerequisite/evidence failures return bilingual messages; unexpected failures are logged server-side and return a generic message instructing the user to check saved status before retrying. Existing authorization and write action remain intact.
- `tests/training-practical-form.test.ts`: render the actual form for two module IDs and verify each receives its own hidden identifier.

## Verification

- Before the fix, the real isolated finance form had zero moduleCode inputs; submission reproduced a whole-page server exception and saved no practical evidence.
- `npx tsx --test tests/*.test.ts`: 808 passing tests.
- `npm run build`: passed.
- Real Chromium browser regression against the production build and isolated PostgreSQL DB `sgt_staff_feedback_test` at 127.0.0.1:55439: correct module identifier; finance submission saves SUBMITTED/evidence; reading and quiz timestamps/score retained; approvedAt remains null; non-JavaScript native form submission also saves correctly.
- A quiz prerequisite revoked after page load is rejected inline, without a whole-page exception or loss of typed content/previously saved evidence. A forged teacher-only module is rejected inline with no unauthorized progress record created.
- Test users, sessions and cascading training progress are cleaned up in finally. No production training record is written for verification.
- Evidence folder: `/Users/zhao111/Documents/sgt系统/交付文件/20261102-培训实操提交修复`.

## Release and operational note

Use the standard guarded preflight and release; verify local/GitHub/server commit equality, PM2 and HTTP200. No migration. Staff should refresh the training page after deployment, then submit the affected practical task again. This fix does not mark anyone trained, approve evidence, change finance permissions or bypass prerequisites. Unexpected network/write confirmation failures instruct the user to check saved status before resubmitting.

Rollback application baseline: `a5897adfd58bc3958173399f03a5664dd4e69b1f`.
