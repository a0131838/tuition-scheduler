# TASK-20260425 Admin Feedback WeChat Copy

## Goal

Make admin feedback forwarding easier to paste into WeChat by providing a parent-readable copy format.

## Problem

The existing feedback copy button copied internal record text with session, class, teacher, student, campus, status, and original content fields. When ops pasted that into WeChat, it looked like a backend log instead of a family-facing lesson update.

## Scope

- Add a primary `Copy WeChat Version / 复制微信版反馈` button on `/admin/feedbacks`.
- Keep the existing backend-style copy as `Copy Internal Record / 复制内部记录`.
- Add a `WeChat copy preview / 微信版预览` details block so ops can inspect the exact text before copying.
- For structured parent-facing feedback, output five clean parent-facing sections.
- For older unstructured feedback, fall back to `课堂反馈` plus `课后作业`.
- Do not change forwarding status, teacher submission, attendance, payroll, homework storage, or database schema.

## Files

- `lib/feedback-forward-text.ts`
- `app/admin/feedbacks/page.tsx`
- `docs/tasks/TASK-20260425-admin-feedback-wechat-copy.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- tested WeChat text generation against real recent structured feedback
- tested fallback formatting against old unstructured feedback
- verified the admin feedback page renders WeChat preview and both copy buttons
- `npm run build`
