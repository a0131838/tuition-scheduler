# TASK-20260410 Parent Statement Of Account And Receipt Export Clarity

## Why

Finance needed two things without disturbing existing billing controls:

1. a clear explanation for why some receipt PDFs cannot be exported yet
2. a separate Statement of Account PDF that shows package-level invoice transactions, approved paid amounts, and the remaining balance owing

## Scope

- add a new read-only parent package Statement of Account PDF export
- expose the export link from the finance invoice workbench and package billing page
- replace vague `Pending approval` receipt copy with more explicit finance-facing wording
- polish the statement PDF so it reads more like a formal finance document before sharing outward
- expose invoice creator identity on the finance invoice page so finance can see who prepared and created each invoice
- show creator names more clearly by resolving stored creator emails to `Name (email)` when user records exist
- keep package billing aligned with the same creator display so both invoice views show the same person label
- prevent the global receipt-approval queue from falsely flagging valid proof uploads as missing when no package filter is selected
- split the overloaded finance receipt page into dedicated routes for queue, package workspace, proof repair, and history while keeping all billing actions on the same underlying logic
- keep `Proof Repair` useful as a working repair queue by defaulting it to blocker rows, not only literal file-health problems
- make the `All / 全部` chip on `Proof Repair` explicitly break out of the implicit default blocker mode, so finance can widen the queue from the same page
- keep `Receipt History` visually consistent by removing lower queue-bucket controls that contradict the page-level history mode
- make sure `Back to default queue / 回到默认队列` on `Receipt History` actually jumps back to the live approval queue instead of reloading the history screen
- make sure finance-facing `Receipt Queue / 收据审批队列` entry points clear remembered queue state so they do not unexpectedly reopen `Receipt History`
- make sure the top receipt-mode `Receipt Queue / 收据审批队列` tab clears remembered history mode too, not only the sidebar entry
- surface a `Next best item / 下一条最该处理` summary on queue-facing receipt screens so finance can immediately see what to clear next and why
- strengthen the split package workspace with explicit `Upload`, `Check Records`, and `Create Receipt` step cards so the package flow reads like a guided handoff instead of a long mixed form
- add a dedicated search box on `Receipt History` so finance can quickly find completed receipts and recent actions by student, course, receipt no., invoice no., or uploader
- split `Proof Repair` visually into `Missing payment record` and `Missing file on linked proof` triage groups so finance can tell the repair type before opening a row
- make the top receipt workflow tabs use client-side navigation so switching screens does not hard-refresh the whole admin layout and reset the left finance sidebar scroll position
- keep those top receipt workflow tab switches from auto-scrolling the page back to the top, so the finance workspace stays at the same reading position while changing modes
- give `Receipt Queue / 收据审批队列` a stable dedicated route so the finance sidebar keeps the same active queue state when the queue is reopened from top tabs or dashboard shortcuts

## Guardrails

- do not change invoice creation behavior
- do not change receipt approval rules
- do not change deduction, package balance, or settlement logic
- only count approved receipts inside the formal paid total on the statement PDF

## Verification

- `npm run build`
- open a package billing page and confirm the new Statement of Account PDF link is present
- open the finance invoice page with a selected package and confirm the same export link is present
- confirm receipt actions still require full approval before formal receipt PDF export
- visually confirm the statement PDF has a clearer title area, summary strip, and easier-to-scan transaction table
- confirm the finance invoice preview shows `Prepared by / 创建人`
- confirm the recent invoice table shows `Created by / 创建人`
- confirm the recent invoice table prefers `Name (email)` over raw email when the creator user record exists
- confirm the package billing invoice `By` column prefers `Name (email)` over raw email when the creator user record exists
- confirm a receipt with a valid linked payment proof no longer shows `file missing` in the global approval queue just because the page is opened without `packageId`
- confirm the finance sidebar now exposes dedicated receipt routes for queue, package workspace, proof repair, and history
- confirm `/admin/receipts-approvals?packageId=...` redirects into the package workspace so older links still land on the right split page
- confirm `/admin/receipts-approvals/repairs` shows repair blockers by default and only narrows to attachment-only issues when the `Proof or file issues` chip is selected
- confirm clicking `All / 全部` on `/admin/receipts-approvals/repairs` widens the queue on that same page instead of silently restoring the default blocker scope
- confirm `/admin/receipts-approvals/history` no longer shows lower queue-bucket switches that conflict with the page-level `Receipt History` mode
- confirm `Back to default queue / 回到默认队列` on `/admin/receipts-approvals/history` now opens `/admin/receipts-approvals?clearQueue=1`
- confirm the finance sidebar and receipt-page `Receipt Queue / 收据审批队列` links now open `/admin/receipts-approvals?clearQueue=1` and do not reopen remembered history
- confirm the top `Receipt Queue / 收据审批队列` tab from `/admin/receipts-approvals/history` now opens `/admin/receipts-approvals?clearQueue=1`
- confirm queue-facing screens show `Next best item / 下一条最该处理` with a reason that matches the next row's real blocker or readiness state
- confirm the package workspace shows step cards for `Step 1 Upload`, `Step 2 Check Records`, and `Step 3 Create Receipt`, with `Done / Current / Next` states that match the current proof/receipt progress
- confirm `/admin/receipts-approvals/history` search filters both completed receipts and `Recent Finance Actions` by the entered keyword
- confirm `/admin/receipts-approvals/repairs` shows separate quick-triage groups for `Missing payment record / 缺付款记录` and `Missing file on linked proof / 已关联但缺文件`
- confirm the top receipt workflow tabs switch between `Receipt Queue`, `Package Workspace`, `Proof Repair`, and `Receipt History` without a full page reload, and the left finance sidebar keeps its scroll position
- confirm those top receipt workflow tab switches also keep the main page scroll position instead of jumping the finance workspace back to the top
- confirm the finance sidebar still highlights `Receipt Queue / 收据审批队列` after entering the queue from the top workflow tabs or finance dashboard
