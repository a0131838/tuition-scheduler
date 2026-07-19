# TASK-20260719-feedback-wechat-handoff

## Context

Teacher feedback must still be manually forwarded to family WeChat groups because parents do not yet rely on the parent miniapp alone. The manual-send workflow already existed, but publishing while filtered to `待审核` moved the task to `待发送` and removed it from the current list, making the next step appear unavailable.

## Change

- Renamed the feedback queue from `审核反馈` to `课后反馈` so it covers review and delivery.
- Made feedback cards display the current stage: review, WeChat-group delivery or complete.
- After publication, automatically switch to `待发送`, retain the same expanded feedback and show a clear next-step message.
- Added numbered actions for copying the WeChat text, optionally saving an image, uploading a send screenshot and confirming actual manual delivery.
- Kept automatic miniapp notification state separate from manual WeChat delivery state.

## Non-goals

- No automatic WeChat-group posting was added.
- No feedback, communication-task or audit schema changed.
- No scheduling, attendance, package, finance, payroll or web UI behavior changed.

## Verification

- Native miniapp JavaScript syntax passed.
- 22/22 focused communication and action-centre tests passed.
- The 41-page miniapp release audit passed.
- The production build generated all 208 routes.
- Read-only production inspection found 1 pending-review feedback task and 4 completed feedback tasks; no business records were changed.
- Runtime commit `93a042d` aligned locally, on GitHub and on the server; PM2 PID `2570983` was online and `/admin/login` returned HTTP 200.
- Anonymous communication reads and writes both returned HTTP 401.
- WeChat development version `1.0.11` uploaded successfully at 486,190 bytes (474.8 KB).

## Risk

Low. The change exposes and sequences existing actions more clearly; the operator remains responsible for actually sending the message in WeChat before confirming completion.
