# NEXT

Generated: 2026-02-11 00:23:21
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
d7f3146 (HEAD -> master, origin/master) chore: update NEXT.md + write utf8 without bom
001d5c5 fix: repair booking-links request routes + ensure oneOnOneGroupId column
537c3c7 ux: remove server-action refresh (packages/teachers/booking-links)
0a99fca ux: remove teacher/admin server-action refresh for common ops
cdeb42d ux: remove remaining server-action refresh in admin todos/classes/student list
c552ba3 ux: avoid full refresh on class sessions/enrollments and student edit actions
dae553f packages: allow multiple HOURS packages + top-up and pick enough balance
c6986d1 fix: allow new hours package purchase when depleted
7641641 docs: add employee user guide (md + docx)
006dd92 feat: admin actions without page refresh
4620a41 feat: booking link actions without page refresh
37824a7 feat: booking link slot visibility toggle without page refresh
```

## Untracked Files
```text

```

## Remaining Server-Action Forms
These are the remaining <form action={...}> occurrences that still tend to refresh the page / jump to top:

```text
app/admin\conflicts\page.tsx:676:                                <form action={replaceAppointmentTeacher} style={{ display: "grid", gap: 6 }}>
app/admin\conflicts\page.tsx:695:                                <form action={cancelAppointment}>
app/admin\conflicts\page.tsx:727:                    <form action={replaceSessionTeacher} style={{ display: "grid", gap: 6 }}>
app/admin\conflicts\page.tsx:752:                  <form action={changeClassRoom} style={{ display: "grid", gap: 6 }}>
app/admin\conflicts\page.tsx:790:                  <form action={cancelSession}>
app/admin\login\page.tsx:125:        <form action={login} style={{ display: "grid", gap: 12 }}>
app/admin\manager\users\page.tsx:319:          <form action={addManagerEmail} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginBottom: 10 }}>
app/admin\manager\users\page.tsx:349:                    <form action={removeManagerEmail}>
app/admin\manager\users\page.tsx:371:          <form action={createSystemUser} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
app/admin\manager\users\page.tsx:445:                      <form action={updateSystemUser} style={{ display: "grid", gap: 6, minWidth: 250 }}>
app/admin\manager\users\page.tsx:493:                          <form action={resetSystemUserPassword} style={{ display: "grid", gap: 6, marginBottom: 8 }}>
app/admin\manager\users\page.tsx:503:                          <form action={deleteSystemUser}>
app/admin\setup\page.tsx:54:      <form action={setupAdmin} style={{ display: "grid", gap: 10 }}>
app/admin\schedule\page.tsx:1050:                            <form action={replaceSessionTeacher} style={{ display: "grid", gap: 6 }}>
app/admin\schedule\page.tsx:1071:                            <form action={replaceAppointmentTeacher} style={{ display: "grid", gap: 6 }}>
app/admin\schedule\page.tsx:1091:                            <form action={deleteAppointment}>
app/admin\schedule\page.tsx:1099:                            <form action={deleteSession}>
app/admin\schedule\new\page.tsx:341:            <form action={createSingleSession} style={{ display: "grid", gap: 10, maxWidth: 720 }}>
app/admin\schedule\new\page.tsx:391:          <form action={createSingleAppointment} style={{ display: "grid", gap: 10, maxWidth: 720 }}>
```

## Next Actions
1. Convert pp/admin/schedule/page.tsx to client fetch + APIs (replace teacher, delete appt/session) with scroll preserve.
2. Convert pp/admin/conflicts/page.tsx similarly (replace teacher, cancel appt/session, change room).
3. Convert pp/admin/manager/users/page.tsx similarly (manager emails + system user CRUD/reset).
4. Convert pp/admin/schedule/new/page.tsx (create session/appointment) to API + client submit.
5. Decide whether to convert low-frequency pp/admin/login/page.tsx and pp/admin/setup/page.tsx.

## Notes / Risks
- Some files had UTF-8 BOM previously; BOM was stripped in several touched files to make patching reliable.
- Windows may warn about LF->CRLF; avoid reformat churn if possible.

## Verification
- Local build: 
pm run build (should pass before deploy).
