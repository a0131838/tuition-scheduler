# TASK-20260712 Miniapp Release Readiness

## Goal

Turn the working parent/staff miniapp into a repeatable review-ready build by removing development login values, pinning upload behavior, adding an automated source audit, and documenting privacy, reviewer access, experience-version regression, submission, and post-release operations.

## Code Hardening

- Empty parent and staff mock OpenIDs in tracked production config.
- Keep the production API at `https://sgtmanage.com` with legal-domain checking enabled.
- Pin the verified WeChat base library to `3.15.2` instead of `latest`.
- Disable source-map upload.
- Keep all permission declarations limited to APIs actually used.

## Automated Audit

`npm run miniapp:audit-release` verifies:

- AppID and production API base.
- URL checking, pinned base library, and disabled source maps.
- Empty parent/staff mock login values.
- Valid app/project/sitemap/page JSON.
- Unique page declarations and complete JS/JSON/WXML/WXSS files for every page.
- Absence of the invalid photo-album permission seen earlier in DevTools.

## Compliance And Review Preparation

- Create a real-data inventory for login identity, parent contact, student academic records, requests/uploads, finance documents, notification consent, and staff audit data.
- Distinguish user-selected WeChat files from background chat access; the miniapp does not read chat history.
- Record unused sensitive capabilities: payment, contacts, album, location, camera, and microphone.
- Require a dedicated non-real student and fresh one-use parent invite for WeChat reviewers.
- Provide a parent review path without exposing real employee accounts.

## External Inputs

- Privacy contact name, email, and phone.
- Registered company address.
- Confirmed retention periods for service data, uploaded files, finance documents, and audit records.
- Current certification, filing, privacy-guide, and basic-info screenshots from the WeChat backend.

## Verification

- [x] `npm run miniapp:audit-release`
- [x] Miniapp JavaScript and JSON syntax
- [x] TypeScript
- [x] `git diff --check`
- [x] `npm run build` (186 pages)
- [ ] Experience-version parent/staff regression before submitting `1.0.0`
