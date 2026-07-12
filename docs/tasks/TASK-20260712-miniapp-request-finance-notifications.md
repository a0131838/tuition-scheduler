# TASK-20260712 Miniapp Request And Finance Notifications

## Goal

Complete one production-ready WeChat subscription-message block for parent request progress and finance documents, using official templates from the miniapp account and the existing parent permissions, billing, receipt approval, staff workbench, and five-minute cron.

## Official Templates

- Request status: `服务处理结果通知`, with request number, student, result, update time, and service name.
- Unpaid invoice: `订单支付提醒`, with invoice number and due time.
- Invoice issued: `服务完成通知`, used specifically for the completed service `发票开具`.
- Receipt issued: `服务费到款确认通知`, with student, amount, receiving account, and payment date.
- All four template IDs are runtime secrets and are not repeated in this task document.

## Event Rules

- Queue a request notification after every parent-visible status change, including changes completed through mobile scheduling actions.
- Use the Ticket ID plus its exact update timestamp as the notification target, so later status changes are not suppressed by the first successful send.
- Queue invoice-issued and unpaid notifications when a parent invoice is created; zero-value invoices do not create an unpaid reminder.
- Queue a receipt-issued notification only when the receipt satisfies the configured finance-approval policy.
- Send only to active linked parents with the relevant request or finance permission.

## Consent And Delivery

- Parent home exposes two grouped actions: `请求与财务进度` and `发票与收据`.
- Consent is counted per exact template ID from recorded WeChat authorization results, then reduced by successful sends using that template.
- The sender claims a row before delivery, keeps transient failures for at most three attempts, rejects invalid templates or missing authorization as permanent WeChat errors, and skips service notifications older than seven days.
- The existing five-minute server cron now runs course queueing, course sending, and service/finance sending in one idempotently installed entry with separate logs.

## Staff Operations

- The web notification queue and permitted staff miniapp attention list now cover course, request, unpaid, invoice, and receipt notifications that are due but lack consent.
- Staff see the notification category, student, parent contact, event subject, and the correct parent authorization instruction.
- The list remains read-only and restricted by the existing ADMIN/CS permission boundary.

## Safety

- No database migration.
- No new parent, student, package, invoice, receipt, Ticket, Session, attendance, payroll, or payment mutation path.
- Notification queue writes are best-effort and do not roll back successful business operations.
- Existing course-reminder delivery and quota accounting remain unchanged.

## Verification

- `npx tsc --noEmit`
- `npx tsx --test tests/wechat-miniapp-subscription.test.ts` (6/6 passed)
- `npx tsx --test tests/billing-optimistic-lock.test.ts` (8/8 passed)
- Miniapp JavaScript/JSON and cron shell syntax checks
- `git diff --check`
- `npm run build` (186 pages)

## Final External Check

- After production deploy, a real parent must authorize both new groups from the miniapp home. This is the only action that cannot be performed by the server.
- After authorization, use one clearly identified test request/invoice/receipt flow to confirm all four message displays before routine parent use.

## Production Result

- Release `2026-07-12-r231` deployed at `f28c99d`; 101 migrations are current and 186 pages built.
- Runtime reports 7/7 templates. Authenticated parent configuration returns course 3, service 2, and documents 2.
- Authenticated ADMIN attention API returns two current request-status rows waiting for consent.
- One cron entry is installed. Its automatic service run scanned 2 and recorded waiting consent 2, sent 0, retried 0, failed 0, and skipped 0.
- PM2 is online and `/admin/login` returns 200.
