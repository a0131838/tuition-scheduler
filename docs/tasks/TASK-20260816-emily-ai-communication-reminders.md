# TASK-20260816-emily-ai-communication-reminders

## Context

Emily currently reminds parents, students and teachers about classes, attendance, feedback, reports, Ticket follow-up and teacher confirmations. The information already exists across formal modules, but the follow-up work was fragmented and required manual bilingual rewriting.

## Change

- Add a formal read projection that generates deterministic Chinese, English and bilingual reminder copy from current system-of-record fields.
- Add a web communication-reminder workspace for full queue management, source evidence and audited state changes.
- Upgrade the employee-miniapp reminder page into the mobile execution view while keeping missing WeChat-consent repair separate.
- Share one `AuditLog` state vocabulary across web and miniapp: ready, copied, sent, waiting reply, replied, completed, snoozed and escalated.
- Limit current operations to recent attendance, feedback and report windows, and exclude known test Tickets.
- Restrict web access to managers, CS users and CS-workspace staff; retain the existing miniapp coordination permission.
- Register the reminder workflow plus the existing AI-work and teacher-confirmation pages in the training operation coverage map required by the latest production branch.

## Non-goals

- No automatic WeChat or external message send.
- No schedule, attendance, package, payroll, finance, report-publication or Ticket-state mutation.
- No database migration and no second staff identity system.
- Native WeChat package publishing remains separate from the server deploy.

## Verification

- `npx tsx --test tests/communication-reminders.test.ts` — 4/4 passed.
- `npm run test:backend` — 180/180 passed on the latest production branch.
- `npm run miniapp:audit-release` — passed for 69 pages and production API base URL.
- `node --check miniapp/boss-academic-parent/pages/staff-reminder-attention/staff-reminder-attention.js` — passed.
- Read-only formal projection — 91 current tasks and zero missing recipients, bilingual copy or source links.
- Latest-branch clean-worktree production build passed with 250 generated routes; guarded deploy checks remain mandatory before release.

## Risk

Low-to-medium. The new projection spans several read models, so operators must confirm source facts before sending. Reminder workflow writes are isolated to audit records, and all formal business writes remain outside this feature.
