# TASK-20260414-approval-inbox-v1

## Why

Manager and finance approvals are currently split across several different workspaces, so people can miss items simply because they do not know which page to check first. The first fix should not change any approval rules; it should give users one clear inbox that tells them what needs approval now.

## Scope

- add a unified `/admin/approvals` page for pending approvals
- include only three approval types in v1:
  - parent receipts
  - partner receipts
  - expense claims
- show counts and urgency in one place for the current user
- add sidebar entry and count badge for admin and finance users
- add a pending-approvals summary card on the admin home page

## Included Signals

- pending manager approvals
- pending finance approvals
- pending expense approvals
- overdue approval items
- amount, wait time, and risk summary on each item

## Out of Scope

- sign-in alerts
- normal operational todos
- scheduling coordination follow-up
- email or WhatsApp notifications
- changing approval rules or approval order

## Acceptance

- `/admin/approvals` should load a unified pending-approval list for the current user
- users should be able to filter the inbox by all, manager, finance, expense, and overdue views
- each inbox card should deep-link into the existing handling page for that approval type
- sidebar should show `Approval Inbox / 审批提醒` with a live count
- admin home should show a pending-approvals summary card linked to the inbox
