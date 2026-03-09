# 小赵 Telegram 快捷指令（10 条）

更新日期：2026-03-05  
适用：老板在 Telegram 直接指挥小赵（OpenClaw）  
默认安全规则：所有数据修改都先 `Preview`，你确认后才 `Apply`。
默认回复规则：先说业务结论，再说关键细节；除非老板点名，不展示技术日志、脚本名、JSON 文件名。

---

## A. 教务（6 条）

1. 今日课表（老板最常用）
```text
小赵，看今天课表。
要求：按登录后可见口径返回（剔除请假；一对一全请假不显示）。
可选过滤：老师=<老师名>；校区=<校区名>
```

2. 今日总控
```text
小赵，执行“今日总控检查”：汇总 /admin/todos 与 /admin/conflicts 的待处理项，按风险从高到低给我清单和建议处理顺序。
```

3. 修复单个课次老师（安全版）
```text
小赵，准备修正课次老师。
对象：session
条件：sessionId=<SESSION_ID>
变更：teacherId <OLD> -> <NEW>
限制：最大影响 1 条，不允许修改 startAt/endAt/classId
模式：Preview
```

4. 批量检查明日冲突
```text
小赵，检查明日老师冲突和教室冲突，给我“冲突类型、涉及课次ID、建议动作（换老师/换教室/调时）”列表，不要直接改数据。
```

5. 学生快速排课可行性
```text
小赵，评估学生 <STUDENT_ID> 在 <YYYY-MM-DD HH:mm> 的排课可行性：
1) 老师可用
2) 老师冲突
3) 教室冲突
4) 课包有效性
只输出结论和阻塞项，不执行写入。
```

6. 关闭遗留未点名
```text
小赵，拉取昨日遗留未点名清单，按“老师、课程、课次时间、学生”分组输出，并给出今天闭环执行顺序。
```

---

## B. 财务（5 条）

6. 每日财务健康检查
```text
小赵，执行“财务健康检查”：汇总
1) receipts approvals 待处理
2) undeducted completed 异常
3) partner settlement 待结算
输出数量、风险等级、建议优先级。
```

7. 修正流水备注（不改金额）
```text
小赵，准备修正课包流水备注。
对象：packageTxn
条件：packageId=<PACKAGE_ID> AND txnId in (<TXN_ID_1>,<TXN_ID_2>)
变更：note <OLD> -> <NEW>
限制：最大影响 3 条，不允许修改 deltaMinutes/kind/createdAt
模式：Preview
```

8. 对账核验（只读）
```text
小赵，核验学生 <STUDENT_ID> 最近 30 天：
点名状态、扣减流水、课包剩余是否一致。
输出差异项和可能原因，不做写入。
```

9. 结算导出前检查
```text
小赵，准备导出 partner settlement 前先做检查：
1) 审批链是否完整
2) 结算状态是否可导出
3) 是否存在异常金额
只输出检查结果和阻塞项。
```

10. 工资复核摘要
```text
小赵，生成本月 teacher payroll 复核摘要：
按老师输出课时、应发、异常项（如缺课次/异常扣减），并标出需人工复核名单。
```

---

## C. Apply 确认短语（固定）

当你看完 Preview，确认执行时统一发：

```text
确认执行：CONFIRM <operationId>
同意按当前 preview 结果执行 apply。
```

---

## C2. 已开放 Apply 的实战模板（当前仅 2 类）

### C2-1 课包流水备注（可 Apply）

Preview：
```text
小赵，执行 ops-gateway 预览：
taskType: package_txn.update_note_only
operationId: OP-<日期>-PKGNOTE-001
payload:
  packageId: <PACKAGE_ID>
  txnIds: [<TXN_ID_1>, <TXN_ID_2>]
  newNote: "<新备注>"
safety:
  maxAffected: 3
  forceApply: false
  confirmPhrase: "CONFIRM OP-<日期>-PKGNOTE-001"
confirmationText: ""
```

Apply（你确认后再发）：
```text
小赵，执行 ops-gateway apply：
taskType: package_txn.update_note_only
operationId: OP-<日期>-PKGNOTE-001
payload:
  packageId: <PACKAGE_ID>
  txnIds: [<TXN_ID_1>, <TXN_ID_2>]
  newNote: "<新备注>"
safety:
  maxAffected: 3
  forceApply: true
  confirmPhrase: "CONFIRM OP-<日期>-PKGNOTE-001"
confirmationText: "CONFIRM OP-<日期>-PKGNOTE-001"
```

### C2-2 工单追加跟进备注（可 Apply）

Preview：
```text
小赵，执行 ops-gateway 预览：
taskType: ticket.append_followup_note
operationId: OP-<日期>-TICKETNOTE-001
payload:
  ticketId: <TICKET_ID>
  appendText: "<要追加的跟进内容>"
safety:
  maxAffected: 1
  forceApply: false
  confirmPhrase: "CONFIRM OP-<日期>-TICKETNOTE-001"
confirmationText: ""
```

Apply（你确认后再发）：
```text
小赵，执行 ops-gateway apply：
taskType: ticket.append_followup_note
operationId: OP-<日期>-TICKETNOTE-001
payload:
  ticketId: <TICKET_ID>
  appendText: "<要追加的跟进内容>"
safety:
  maxAffected: 1
  forceApply: true
  confirmPhrase: "CONFIRM OP-<日期>-TICKETNOTE-001"
confirmationText: "CONFIRM OP-<日期>-TICKETNOTE-001"
```

注意：
1. `operationId` 每单唯一。
2. 先 Preview，确认无误后再 Apply。
3. `confirmationText` 必须与 `confirmPhrase` 完全一致。

---

## D. 强制执行约束（发给小赵时可追加）

```text
执行约束：
1) 严格遵守 Preview -> Confirm -> Apply
2) 每次输出 affectedCount 与 sampleIds
3) 超过 maxAffected 自动拒绝
4) 输出回滚方案
```

---

## E. 老板一键口令（开工 / 中午 / 收工）

11. 开工口令
```text
小赵，执行“开工巡检模式”：
1) 汇总 /admin/todos（未点名、冲突、续费预警）
2) 汇总 /admin/conflicts（按严重度排序）
3) 输出今日前三优先任务（带建议负责人）
只做读取与分析，不做写入。
```

12. 中午口令
```text
小赵，执行“中午复查模式”：
1) 复查上午未闭环项
2) 检查老师反馈超时与未点名新增
3) 检查财务待审批和未扣费异常
输出“已闭环 / 未闭环 / 下午建议动作”。
```

13. 收工口令
```text
小赵，执行“收工复盘模式”：
1) 汇总今日变更与未完成任务
2) 列出明日必须优先处理事项（按风险排序）
3) 给出明日开工清单
如涉及数据修改请求，只生成 Preview 计划，不执行 Apply。
```

14. 记录问题
```text
小赵，记录这个问题。
要求：先按“问题入库规则”判断；符合才写入问题库，不要写长篇分析。
```

15. 今日风控日报
```text
小赵，发今天的系统风控日报。
要求：只读；只报今天高风险、遗漏、待处理重点。
```

16. 今日员工遗漏追踪
```text
小赵，发今天员工遗漏追踪清单。
要求：按严重度排序，只报今天待闭环项。
```

17. 本周系统审计
```text
小赵，做本周系统审计。
要求：按周审计模板输出；优先引用问题库编号，不重复写背景长文。
```

18. 升级主规则
```text
小赵，更新这个规则到主文档。
要求：只有老板已明确批准时才执行；否则先给更新预览。
```

19. 按工单中心开始处理
```text
小赵，按工单中心开始处理。
要求：读取工单中心，按优先级、SLA、最晚截止时间排序，输出今日应先处理的工单清单；不要直接改数据。
```

20. 预览执行第 X 张工单
```text
小赵，预览执行第2张工单。
要求：先判断工单类型；若属于已开放预览类型，再输出执行预览、阻塞项和确认要求；不要直接 Apply。
```

21. 确认执行第 X 张工单
```text
小赵，确认执行第2张工单。
要求：只有该工单已存在预览结果且属于允许确认的类型，才继续；否则先拒绝并说明原因。
```

22. 批准并加入执行队列
```text
小赵，这条我批准，加入执行队列。
要求：只写入执行队列，不直接改代码，不直接部署。
```

23. 记录到执行队列，待 Codex 执行
```text
小赵，记录到执行队列，待 Codex 执行。
要求：给我队列编号、事项摘要、待执行动作。
```

24. 查看当前执行队列
```text
小赵，列出当前执行队列。
要求：只列 pending 项，按时间排序。
```

25. 读取执行队列
```text
小赵，读执行队列。
要求：返回当前 pending 队列，按时间排序；只说编号、摘要、待执行动作。
```

26. 今天工单最急的3张
```text
小赵，今天工单最急的3张。
要求：只看未归档工单；按优先级、SLA、最晚截止排序；每张只说结论和下一步。
```

27. 今天谁还没处理工单
```text
小赵，今天谁还没处理工单。
要求：按负责人汇总今天未闭环工单和超时工单，只报重点人。
```

28. 今天排课风险汇总
```text
小赵，今天排课风险汇总。
要求：只汇总冲突、请假影响、未点名、课包余额不足等排课风险，不报无关内容。
```

29. 今天财务异常汇总
```text
小赵，今天财务异常汇总。
要求：只汇总未扣费、异常流水、待审批、结算阻塞等财务风险，按严重度排序。
```
