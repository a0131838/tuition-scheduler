# NEXT

Generated: 2026-02-14 17:40:55
Branch: master

## Context
- Goal: remove high-frequency server-actions/redirect flows that cause page flash + scroll-to-top; replace with client fetch + API + scroll preserve.
- Deploy policy: finish a batch, then do ONE unified push + deploy.

## Current Status
```text
## master...origin/master
```

## Changed Files (diff --name-only)
```text

```

## Diff Summary (diff --stat)
```text

```

## Recent Commits
```text
ddbfb62 (HEAD -> master, origin/master) feat: add partner student fields and fix availability form reset
1cc26bb feat: add partner student intake page with fixed source/type
c06eec7 fix: avoid function children from server component in packages modal
a8bde3a feat: migrate admin actions to client APIs and fix modal feedback flow
d2ad6fa chore: update NEXT.md (eod)
d7f3146 chore: update NEXT.md + write utf8 without bom
001d5c5 fix: repair booking-links request routes + ensure oneOnOneGroupId column
537c3c7 ux: remove server-action refresh (packages/teachers/booking-links)
0a99fca ux: remove teacher/admin server-action refresh for common ops
cdeb42d ux: remove remaining server-action refresh in admin todos/classes/student list
c552ba3 ux: avoid full refresh on class sessions/enrollments and student edit actions
dae553f packages: allow multiple HOURS packages + top-up and pick enough balance
```

## Untracked Files
```text

```

## Remaining Server-Action Forms
These are the remaining <form action={...}> occurrences that still tend to refresh the page / jump to top:

```text

```

## Next Actions
1. Server-action form cleanup is complete for `app/admin` and `app/teacher` (`<form action={...}>` occurrences are now zero).
2. Do focused manual regression on high-traffic pages:
   - `/admin/schedule`, `/admin/conflicts`, `/admin/manager/users`, `/admin/schedule/new`, `/admin/login`, `/admin/setup`.
   - Verify no page flash/scroll-to-top regressions on action submit.
3. Run one unified push + deploy after regression sign-off.

## Notes / Risks
- Some files had UTF-8 BOM previously; BOM was stripped in several touched files to make patching reliable.
- Windows may warn about LF->CRLF; avoid reformat churn if possible.

## Verification
- Local build:
`npm run build` (pass)
- Automated checks on 2026-02-14:
`npm run test:auth` (pass, 4/4)
`rg -n "<form action=\{" app/admin app/teacher -S` (no matches)
`rg -n "window\.scrollY|router\.refresh\(" app/admin/{schedule,conflicts,manager/users} -S` (preserve-refresh pattern present in target client components)

## Manual Regression Checklist
1. `/admin/schedule`
- Replace teacher (session/appointment) keeps page position and updates row state.
- Delete session/appointment keeps page position and removes row.
2. `/admin/conflicts`
- Change appointment teacher / cancel appointment keeps page position and updates conflict card.
- Change session teacher / change class room / cancel session keeps page position and updates card.
3. `/admin/manager/users?mode=edit`
- Add/remove manager email, create/update/reset/delete user all keep page position and show updated table.
4. `/admin/schedule/new`
- Create session and create appointment both redirect to matching week on `/admin/schedule`.
5. `/admin/login` and `/admin/setup`
- Submit errors show inline banner; success redirects to returned `redirectTo`.
