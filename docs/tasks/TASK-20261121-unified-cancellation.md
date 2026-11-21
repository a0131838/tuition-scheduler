# Unified lesson cancellation and read-only history

User authorised all recommendations on 2026-11-21, limited to cancellation/rescheduling/deletion and related reporting across web and mini program.

## Result

- Shared requester/reason/charge validation for calendar, admin attendance, native mini program and its assisted cancellation command. Parent deductions remain explicit under the approved school policy; counts do not trigger a charge. Teacher/school cancellations cannot charge, including forged requests.
- Calendar prechecks actual package deduction before confirmation. Hour and group-minute packages use lesson minutes, group-count uses one lesson, monthly retains existing zero balance deduction. Session lock, serializable writes and ledger verification protect repeat/concurrent handling.
- Add nullable Attendance requester/reason fields. Migration does not classify old notes or change balances. Explicit parent counts exclude teacher, school and unknown historical records.
- Replace x/del with Cancel lesson and Delete mistaken lesson; cancellation result displays cause and deduction. Delete stays under More for unused future lessons, and existing history guards remain enforced. Restore retains its conflict checks and refund behavior.
- Finance web layout and menu admit the read-only cancelled report. New staff mini program history endpoint/page admits Finance, Operations and designated managers, with ordinary teachers denied. Finance cancellation/restore writes remain blocked.
- Read-only list supports dates, student and charge/requester filters. Recorded cancellation/reschedule/deletion history uses operation dates; normal cancellation rows use lesson dates. Limited results are labelled. No raw deletion snapshots or parent contact fields are returned to the mini program.
- Native mini program retains all previous pages and features. New source version 1.1.04 is based on production plus the verified 1.1.03 release, whose only source difference before this task was clientVersion. Shared upload script and source tag govern development upload; channel confirmation is separate.

## Validation

- `scripts/qa/unified-cancellation-uat.ts` guards both database URLs to 127.0.0.1:55439/sgt_final_periods_uat before fixtures. It passes teacher no-charge, explicit parent charge, repeated and concurrent requests, restore rollback, four prior parent cancellations without automatic charge, signed mini preview tampering, attendance rule parity, retained legacy rows, Finance read-only and teacher denial, deletion history, and existing reschedule notifications. Group-count, group-minutes and monthly packages produce the same web/mini results.
- Playwright used isolated Admin and Finance accounts to submit a real calendar cancellation, inspect its actual 90-minute confirmation and persisted result, and capture read-only Finance filtering/results/history. Assets contain only synthetic training students.
- WeChat Developer Tools compiled an isolated copy of the new source connected only to the local test database. Actual native page methods selected Teacher, prechecked zero deduction, confirmed cancellation and queried Finance cancellation/deletion history. No production cancellation was tested by writing real student records.
- 185 backend regressions and 33 focused cancellation/AI token/payroll regressions pass. TypeScript and production build pass.
- SOP `docs/SOP-教务财务-取消改期删除与扣课-中英文培训版-20261121.html` renders 12 A4 landscape pages with real Playwright screenshots/red callouts. Text, page count, page previews and footer overlap checked. PDF is an output artifact.

## Deployment and mini program follow-through

Use guarded standard release and require local/GitHub/server commit equality and HTTP health. Read production records only after deployment. Version Management browser access was blocked by the browser site-safety policy, so setting/confirming experience or production channels requires an authorised user in WeChat's platform. Do not label development upload as experience/production release. Record source commit, file manifest and upload receipt in codex/miniapp-releases.

## Staff steps

Web: student -> Cancel lesson -> requester -> reason -> optional parent deduction -> precheck/confirm -> verify crossed-out lesson and actual deduction.
Mini: staff timetable -> lesson -> cancellation -> requester/reason -> precheck -> confirm -> verify. Related work orders remain optional and must be checked before completion.
Finance: Finance Workbench -> Cancellations & lesson history; choose actual lesson date range, including future end dates as needed. Expand history for operation-date evidence. Mini staff home provides the same read-only query.
Reschedule: Quick Schedule -> Reschedule Existing Session -> This session only -> confirm -> send the generated latest notice and record evidence. No deletion/recreation workaround is required.
