# TASK-20260424 Contract Sign Success Feedback

## Summary

Fix the public contract sign experience so the page does not appear to merely refresh after a successful submit. After signing, the route should revalidate and show a clear success banner immediately.

## Scope

- mark the public contract sign page as fully dynamic
- revalidate the contract sign route after a successful submit
- show a top-of-page green success banner when the redirect returns with `?msg=signed`

## Files

- `app/contract/[token]/page.tsx`

## Risk

Low. This only changes success feedback and cache freshness for the public sign page. It does not change contract content, invoice math, partner settlement logic, or package balance updates.

## Verification

- `npm run build`
- verify successful sign submit redirects back with `?msg=signed`
- verify the page shows `Signature submitted successfully / 签署已提交成功`
- verify the existing signed result card still renders normally when the contract has reached `SIGNED / INVOICE_CREATED`
