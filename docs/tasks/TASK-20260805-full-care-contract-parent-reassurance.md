# TASK — Full Care contract, channel and parent reassurance launch

- Release: `2026-08-05-r313`
- Owner: Management / Academic / Finance
- Status: Ready for controlled production release

## Outcome

Make the first 3–5 Full Care families sign one controlled scope, complete operational authorisation, bind parent report access, pass a seven-item launch gate and receive a reviewed parent reassurance view that answers current status, recent action, next action and next update.

## Product and operational changes

- Add a bilingual Full Care Service Addendum to the ordinary student contract snapshot and signed PDF.
- Freeze tuition/care fee split, service period, cadence, delivery channel, emergency advance ceiling, scope and exclusions.
- Keep channel name and commission rate internal; audit the snapshot but never render or serialize it to parents.
- Show an internal 15% settlement preview, subject to actual eligible net receipts and channel-agreement exclusions.
- Add post-signature links to parent binding and the care launch gate.
- Block a new DRAFT care project from activation until the signed care agreement, parent report access, reviewer and initial plan exist, in addition to the existing date/scope/owner controls.
- Add a parent reassurance dashboard backed only by published, parent-audience records and verified parent-visible risks.
- Provide the channel agreement, parent authorisation form and full launch execution handbook.

## Data and safety boundaries

- No database migration and no rewrite of existing student, package, lesson, balance, invoice, receipt or care records.
- Existing ACTIVE/PAUSED projects are not retrospectively blocked from resuming; the expanded gate applies to first activation from DRAFT.
- No real rehearsal student, parent, payment or package is generated automatically. The operator walks the prepared flow with non-sensitive training data.
- Parent APIs do not select internal notes, internal risk facts, channel commission or internal pricing.
- Legal templates require Singapore legal, tax and PDPA review before external execution.

## Validation

- `npx tsx --test tests/student-contract-mode.test.ts tests/miniapp-parent-service-progress.test.ts tests/care-validation.test.ts tests/care-operations.test.ts`
- `npx tsc --noEmit`
- `npm run test:backend`
- `npm run miniapp:audit-release`
- `npm run build`
- `git diff --check`
- A4 DOCX/PDF render and visual review of all seven pages

## Post-release acceptance

1. Use only synthetic training data to create a DRAFT care project and confirm incomplete controls are visibly marked.
2. Confirm activation fails before contract, parent binding, reviewer and plan are complete.
3. Complete the test signature and parent binding; confirm all seven controls become ready and activation succeeds.
4. Publish one parent-safe update and confirm the Parent Mini Program displays the four reassurance answers without internal data.
5. Upload a new Mini Program development build, complete a parent-device experience test, then decide whether to submit for formal WeChat review. Server release alone does not publish the native package.
