# TASK-20260424-first-purchase-redirect-error-fix

## Summary

Fix the dedicated first-purchase setup flow so a successful server-action redirect is not caught and re-rendered as a visible `NEXT_REDIRECT` error on the page.

## Problem

On `/admin/students/[id]/first-purchase`, clicking `Create first package and contract / 创建首购课包和合同` could succeed far enough to consume the submitted parent intake and create downstream records, but the page then showed a red `NEXT_REDIRECT` error banner instead of navigating to the package contract workspace.

## Root Cause

The server action wrapped the create flow in `try/catch` and then treated the framework redirect exception like a normal application error. That converted a successful `redirect(...)` into `err=NEXT_REDIRECT`.

## Change

- import `isRedirectError` in `app/admin/students/[id]/first-purchase/page.tsx`
- rethrow redirect exceptions inside the action catch block
- keep normal error redirect handling for real validation or business failures

## Verification

- `npm run build`
- submit first-purchase setup and verify success redirects into `/admin/packages/[id]/contract`
- verify non-redirect failures still return to the setup page with a readable error
