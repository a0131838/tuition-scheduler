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
