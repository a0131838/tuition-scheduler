# TASK-20260723-renewal-followup-center

## Context

学生课时或课包有效期接近用完时没有稳定负责人，也没有从提醒家长一直跟到合同、付款和新课包生效的统一记录。教务容易漏续费，管理者也无法区分“已经提醒”与“已经完成续费”。

## Change

- 新增独立 `RenewalTask`，按课包保证最多一条开放任务。
- 每天新加坡时间 08:00 自动刷新预测；员工打开统一待办或续费工作台时也会刷新。
- 综合剩余课时、未来已排课程、近四周消耗速度和课包有效期，生成黄色、橙色、红色和已不足四级风险。
- 新增网页端续费工作台，覆盖家长联系、考虑、确认、合同/账单、付款和新课包生效。
- 新增员工小程序续费工作台、统一待办、学生360和管理健康看板入口。
- 保留人工微信群沟通，提供可复制文案，并在确认已提醒家长前要求上传发送截图。
- 所有续费状态和截图操作写入审计日志。
- 老师账号不能打开续费工作台或学生360运营页面，也不返回学生课时、家长和续费信息。

## Non-goals

- 不修改现有课时扣减、排课、点名、工资、发票、收据或课包充值规则。
- 不自动向家长发送微信消息。
- 不自动取消课程，不自动使用其他课包，不自动批准折扣或财务单据。

## Verification

- `npx prisma generate`
- `npx tsc --noEmit`
- `npx tsx --test tests/renewal-management.test.ts tests/parent-communication-center.test.ts tests/miniapp-action-center.test.ts tests/miniapp-operation-audit.test.ts`（31/31）
- `npm run test:backend`（100/100）
- `npm run build`（213 routes）

## Production result

- Runtime feature commit `c431f094dc65b83fa993d9feda1bce0dda6e34ea` is aligned locally, on GitHub and on the server.
- Production has all 112 migrations current; PM2 PID `3971356` is online and `/admin/login` returns HTTP 200.
- The first controlled renewal sync created 20 open tasks: 8 `EXHAUSTED`, 4 `RED`, 8 `YELLOW`; 18 are `PENDING_CONTACT` and 2 are `PAYMENT_PENDING`.
- Anonymous miniapp renewal access returns 401. Automated access-boundary tests confirm teachers cannot access renewal or Student360 operational data.
- WeChat development version `1.0.14` uploaded successfully for AppID `wxe7017f8545e8ad49` at 527,564 bytes (515.2 KB).
- Experience-version designation and physical-phone acceptance for Emily, Eva and Jasmine's management account remain manual rollout gates. No teacher renewal test is required because the feature is intentionally absent from teacher accounts.

## Risk

Medium. The release adds one isolated workflow table and read-side forecasting across existing package/session data. It never mutates package balances, sessions, attendance, invoices, receipts, payroll, or partner settlement. Forecasts guide human follow-up only; operators must verify special cases such as shared packages, pauses, gifts, and refunds before contacting parents.
