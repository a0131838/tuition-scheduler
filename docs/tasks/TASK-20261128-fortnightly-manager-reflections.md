# Manager Quality Desk · 双周管理复盘

Open **Admin → Manager Quality Desk → Fortnightly reflection / 双周复盘**. The daily teacher schedule has its own date selector. Reflection dates follow Asia/Singapore.

1. Check the period and due date. The default first period runs from 30 November to 13 December 2026. Use **Set first due date / 设置首次截止日** before the first draft or submission to choose another anchor for your own log.
2. Select **Complete**, **Follow-up needed** or **N/A** for each of the four operational checks. Describe the next step for each item that needs follow-up.
3. Reflect on one event or recurring pattern using Description, Feelings, Evaluation, Analysis and Conclusion. Leave a stage blank when it does not apply.
4. Add one to three actions. Give each an action, deadline, observable evidence of progress and status. Under **Review of previous actions**, update outstanding actions and optionally record progress or a blocker.
5. Choose **Save draft / 保存草稿** to return later. When ready choose **Submit reflection / 提交复盘**. The system records the Singapore submission date and locks that version.
6. Check the reminder at the top of the desk from two calendar days before the due date. Open the linked period to submit. Overdue periods can still be completed. The next deadline stays 14 days after the previous deadline.
7. Use **Reflection periods & history / 周期与历史记录** to revisit a draft or read an earlier submission. Use **Daily reflection archive (read-only) / 历史日报（只读）** to view your original daily records. Select **All dates / 全部日期** for the full archive.

## Release verification

- Apply the additive schedule and period migration. Each manager has a separate schedule and one record per period. Submitted records keep the original action plan and each later review.
- Run the fortnightly reflection tests, backend regression suite, production build and isolated browser workflow. Exercise two managers and a non-manager, partial drafts, concurrent saves, duplicate submission and overdue action carry-forward.
- Compare the raw production daily archive count, checksum and last modification timestamp before and after release.
- Release r528. Previous deployment commit `21300c95`.
