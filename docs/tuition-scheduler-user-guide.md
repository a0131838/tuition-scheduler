# Tuition Scheduler (sgtmanage.com) User Guide

Last Updated: 2026-03-05  
Canonical Source: `docs/员工使用手册-完整版.md`

This file is the bilingual/quick external guide. For internal full SOP, always follow the canonical Chinese full manual.

## 1. Entry Points

- Admin: `https://sgtmanage.com/admin`
- Admin Login: `https://sgtmanage.com/admin/login`
- Teacher: `https://sgtmanage.com/teacher`
- Booking Link: `https://sgtmanage.com/booking/{token}`
- Ticket Intake: `https://sgtmanage.com/tickets/intake/{token}`

## 2. Daily Operations (Admin)

1. Check `/admin/todos`
2. Resolve `/admin/conflicts`
3. Handle schedule changes in `/admin/schedule`
4. Create one-off sessions via `/admin/schedule/new`
5. Verify attendance and package deductions

## 3. Daily Operations (Teacher)

1. Check `/teacher`
2. Maintain `/teacher/availability`
3. Mark attendance in `/teacher/sessions/[id]`
4. Submit feedback within 12 hours

## 4. Finance Ops

- Receipt approvals: `/admin/receipts-approvals`
- Package ledger: `/admin/packages/[id]/ledger`
- Partner settlement: `/admin/reports/partner-settlement`
- Teacher payroll: `/admin/reports/teacher-payroll`

## 5. OpenClaw Assistant Policy

For any data update request, enforce:
1. Preview first (affected rows + before/after)
2. Explicit owner confirmation
3. Apply
4. Post-change verification evidence

## 6. Production Health Quick Check

- Homepage 200: `/`
- Admin login 200: `/admin/login`
- Unauthorized admin redirect: `/admin`
- Cron endpoint auth-protected: `/api/cron/conflict-audit`
