# TASK — Full Care mobile navigation polish

## Goal

Remove the remaining narrow-screen navigation and badge readability issues found in the Full Care UI review.

## Changes

- Keep every navigation tab as a non-shrinking horizontal item.
- Add touch momentum, bounded horizontal overscroll and snap assistance.
- Remove the negative mobile edge that visually clipped the final tab.
- Prevent SLA and status badges from wrapping into vertical text.

## Verification

- Production build.
- Standard guarded release and login health check.

## Rollback

Revert r326 and redeploy r325; no data rollback is required.
