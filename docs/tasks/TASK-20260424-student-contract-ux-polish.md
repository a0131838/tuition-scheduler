## Task

Polish the student contract workflow so ops see business-facing next steps instead of technical states, parent pages are lighter, invoice linkage is visible on-contract, and archived/void history no longer clutters the active workspace.

## Why

- The contract flow was functionally complete, but the UI still felt system-shaped rather than ops-shaped.
- Student detail did not surface the contract workspace clearly enough for daily use.
- Parent intake and sign pages needed clearer step framing and less unnecessary information density.
- Signed/invoiced contracts needed a clear "void and regenerate" correction path instead of implying direct edits.
- Legacy direct-billing packages without contract history needed an explicit reminder that the next renewal must use the new contract flow.

## Scope

- Update business-facing contract status labels.
- Add stronger contract summary and next-step cues on student detail.
- Improve package billing contract cards with invoice/open-approval links and correction guidance.
- Split void history into deletable void drafts vs archived business history.
- Simplify parent intake and contract sign pages with step indicators and lighter framing.
- Add legacy-no-contract reminder for direct-billing packages that already have billing/use history but no contract record.

## Key Files

- `lib/student-contract.ts`
- `app/admin/students/[id]/page.tsx`
- `app/admin/packages/[id]/billing/page.tsx`
- `app/contract-intake/[token]/page.tsx`
- `app/contract/[token]/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Validation

- `npm run build`
- Local QA pages confirmed:
  - student detail now shows `Open contract workspace / 打开合同工作区`
  - student detail now shows the business next-step copy for intake-stage contracts
  - intake page now shows `Parent profile confirmation / 家长资料确认`
  - sign page now shows `Agreement preview / 正式合同预览`
  - sign-stage billing page now shows `Waiting for signature`
- Temporary QA student/package/contract/auth-session data removed after verification.
