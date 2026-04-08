# TASK-20260408-teacher-lead-v1

## Goal

Add a narrow `Teacher Lead / 老师主管` role for selected teacher accounts so they can keep normal teacher access and also open a teacher-side lead desk that shows the all-teachers daily schedule.

## Scope

- add `TeacherLeadAcl` as an additive ACL table
- add teacher-lead auth helpers without changing `UserRole`
- add admin manager-user maintenance for teacher-lead emails
- add `/teacher/lead` as a read-only lead desk
- add a conditional `Lead Desk / 主管工作台` nav item in the teacher portal

## Non-Goals

- no admin-finance access
- no student editing powers
- no payroll / receipt / expense approval
- no system settings or user-management powers outside the ACL maintenance page
- no schedule editing in v1

## Verification

- `npm run prisma:generate`
- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- `https://sgtmanage.com/admin/login` returns `200`

## Files

- `prisma/schema.prisma`
- `prisma/migrations/20260408093000_add_teacher_lead_acl/migration.sql`
- `lib/auth.ts`
- `app/api/admin/manager/teacher-leads/route.ts`
- `app/api/admin/manager/teacher-leads/[id]/route.ts`
- `app/admin/manager/users/page.tsx`
- `app/admin/manager/users/_components/TeacherLeadEmailAddClient.tsx`
- `app/admin/manager/users/_components/TeacherLeadEmailRemoveClient.tsx`
- `app/teacher/layout.tsx`
- `app/teacher/lead/page.tsx`
