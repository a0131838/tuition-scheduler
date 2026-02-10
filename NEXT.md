# NEXT

Generated: 2026-02-11 00:02:10
Branch: master

## Context
- Goal: remove high-frequency server-actions/redirect flows that cause page flash + scroll-to-top; replace with client fetch + API + scroll preserve.
- Deploy policy: finish a batch, then do ONE unified push + deploy.

## Current Status
```text
## master...origin/master
 M app/admin/_components/OneOnOneTemplateForm.tsx
 M app/admin/_components/PackageEditModal.tsx
 M app/admin/_components/TeacherCreateForm.tsx
 M app/admin/booking-links/[id]/page.tsx
 M app/admin/booking-links/_components/BookingLinkCreateForm.tsx
 M app/admin/booking-links/page.tsx
 M app/admin/courses/page.tsx
 M app/admin/feedbacks/page.tsx
 M app/admin/layout.tsx
 M app/admin/packages/[id]/ledger/page.tsx
 M app/admin/packages/page.tsx
 M app/admin/sessions/[id]/attendance/page.tsx
 M app/admin/teachers/[id]/page.tsx
 M app/admin/teachers/page.tsx
 M app/teacher/layout.tsx
?? NEXT.md
?? app/admin/_components/LanguageSelectorClient.tsx
?? app/admin/booking-links/[id]/_components/BookingRequestActionsClient.tsx
?? app/admin/courses/AdminCoursesClient.tsx
?? app/admin/feedbacks/MarkForwardedFormClient.tsx
?? app/admin/feedbacks/ProxyDraftFormClient.tsx
?? app/admin/packages/PackageCreateFormClient.tsx
?? app/admin/packages/[id]/ledger/PackageLedgerGiftClient.tsx
?? app/admin/sessions/[id]/attendance/AdminSessionAttendanceClient.tsx
?? app/admin/teachers/DeleteTeacherButtonClient.tsx
?? app/admin/teachers/[id]/CreateAndBindTeacherUserFormClient.tsx
?? app/admin/teachers/[id]/DeleteTeacherNavigateClient.tsx
?? app/admin/teachers/[id]/DeleteTemplateButtonClient.tsx
?? app/admin/teachers/[id]/GenerateSessionsButtonClient.tsx
?? app/admin/teachers/[id]/UnbindTeacherUserButtonClient.tsx
?? app/api/admin/booking-links/[linkId]/
?? app/api/admin/booking-links/route.ts
?? app/api/admin/courses/
?? app/api/admin/feedbacks/
?? app/api/admin/language/
?? app/api/admin/levels/
?? app/api/admin/packages/
?? app/api/admin/sessions/
?? app/api/admin/subjects/
?? app/api/admin/teachers/[id]/generate-sessions/
?? app/api/admin/teachers/[id]/one-on-one-templates/
?? app/api/admin/teachers/[id]/route.ts
?? app/api/admin/teachers/[id]/user/
?? app/api/admin/teachers/route.ts
?? app/teacher/logout/
?? ops/codex/
```

## Changed Files (diff --name-only)
```text
[error] warning: in the working copy of 'app/admin/_components/OneOnOneTemplateForm.tsx', LF will be replaced by CRLF the next time Git touches it
```

## Diff Summary (diff --stat)
```text
[error] warning: in the working copy of 'app/admin/_components/OneOnOneTemplateForm.tsx', LF will be replaced by CRLF the next time Git touches it
```

## Recent Commits
```text
0a99fca (HEAD -> master, origin/master) ux: remove teacher/admin server-action refresh for common ops
cdeb42d ux: remove remaining server-action refresh in admin todos/classes/student list
c552ba3 ux: avoid full refresh on class sessions/enrollments and student edit actions
dae553f packages: allow multiple HOURS packages + top-up and pick enough balance
c6986d1 fix: allow new hours package purchase when depleted
7641641 docs: add employee user guide (md + docx)
006dd92 feat: admin actions without page refresh
4620a41 feat: booking link actions without page refresh
37824a7 feat: booking link slot visibility toggle without page refresh
0d32262 fix: teacher availability client props must be serializable
bc89aa8 feat: teacher availability actions without full-page refresh
fd16fbf fix: restore scroll before hydration to avoid jump-to-top
```

## Untracked Files
```text
NEXT.md
app/admin/_components/LanguageSelectorClient.tsx
app/admin/booking-links/[id]/_components/BookingRequestActionsClient.tsx
app/admin/courses/AdminCoursesClient.tsx
app/admin/feedbacks/MarkForwardedFormClient.tsx
app/admin/feedbacks/ProxyDraftFormClient.tsx
app/admin/packages/PackageCreateFormClient.tsx
app/admin/packages/[id]/ledger/PackageLedgerGiftClient.tsx
app/admin/sessions/[id]/attendance/AdminSessionAttendanceClient.tsx
app/admin/teachers/DeleteTeacherButtonClient.tsx
app/admin/teachers/[id]/CreateAndBindTeacherUserFormClient.tsx
app/admin/teachers/[id]/DeleteTeacherNavigateClient.tsx
app/admin/teachers/[id]/DeleteTemplateButtonClient.tsx
app/admin/teachers/[id]/GenerateSessionsButtonClient.tsx
app/admin/teachers/[id]/UnbindTeacherUserButtonClient.tsx
app/api/admin/booking-links/[linkId]/requests/[requestId]/approve/route.ts
app/api/admin/booking-links/[linkId]/requests/[requestId]/reject/route.ts
app/api/admin/booking-links/route.ts
app/api/admin/courses/route.ts
app/api/admin/feedbacks/forwarded/route.ts
app/api/admin/feedbacks/proxy-draft/route.ts
app/api/admin/language/route.ts
app/api/admin/levels/route.ts
app/api/admin/packages/[id]/ledger/gift/route.ts
app/api/admin/packages/[id]/route.ts
app/api/admin/packages/[id]/top-up/route.ts
app/api/admin/packages/route.ts
app/api/admin/sessions/[id]/attendance/mark-all-present/route.ts
app/api/admin/sessions/[id]/attendance/route.ts
app/api/admin/subjects/route.ts
app/api/admin/teachers/[id]/generate-sessions/route.ts
app/api/admin/teachers/[id]/one-on-one-templates/[templateId]/route.ts
app/api/admin/teachers/[id]/one-on-one-templates/route.ts
app/api/admin/teachers/[id]/route.ts
app/api/admin/teachers/[id]/user/create-and-bind/route.ts
app/api/admin/teachers/[id]/user/unbind/route.ts
app/api/admin/teachers/route.ts
app/teacher/logout/route.ts
ops/codex/README.md
ops/codex/eod.ps1
ops/codex/sod.ps1
```

## Remaining Server-Action Forms
These are the remaining <form action={...}> occurrences that still tend to refresh the page / jump to top:

```text
app/admin\setup\page.tsx:54:      <form action={setupAdmin} style={{ display: "grid", gap: 10 }}>
app/admin\schedule\page.tsx:1050:                            <form action={replaceSessionTeacher} style={{ display: "grid", gap: 6 }}>
app/admin\schedule\page.tsx:1071:                            <form action={replaceAppointmentTeacher} style={{ display: "grid", gap: 6 }}>
app/admin\schedule\page.tsx:1091:                            <form action={deleteAppointment}>
app/admin\schedule\page.tsx:1099:                            <form action={deleteSession}>
app/admin\conflicts\page.tsx:676:                                <form action={replaceAppointmentTeacher} style={{ display: "grid", gap: 6 }}>
app/admin\conflicts\page.tsx:695:                                <form action={cancelAppointment}>
app/admin\conflicts\page.tsx:727:                    <form action={replaceSessionTeacher} style={{ display: "grid", gap: 6 }}>
app/admin\conflicts\page.tsx:752:                  <form action={changeClassRoom} style={{ display: "grid", gap: 6 }}>
app/admin\conflicts\page.tsx:790:                  <form action={cancelSession}>
app/admin\schedule\new\page.tsx:341:            <form action={createSingleSession} style={{ display: "grid", gap: 10, maxWidth: 720 }}>
app/admin\schedule\new\page.tsx:391:          <form action={createSingleAppointment} style={{ display: "grid", gap: 10, maxWidth: 720 }}>
app/admin\login\page.tsx:125:        <form action={login} style={{ display: "grid", gap: 12 }}>
app/admin\manager\users\page.tsx:319:          <form action={addManagerEmail} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginBottom: 10 }}>
app/admin\manager\users\page.tsx:349:                    <form action={removeManagerEmail}>
app/admin\manager\users\page.tsx:371:          <form action={createSystemUser} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
app/admin\manager\users\page.tsx:445:                      <form action={updateSystemUser} style={{ display: "grid", gap: 6, minWidth: 250 }}>
app/admin\manager\users\page.tsx:493:                          <form action={resetSystemUserPassword} style={{ display: "grid", gap: 6, marginBottom: 8 }}>
app/admin\manager\users\page.tsx:503:                          <form action={deleteSystemUser}>
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

