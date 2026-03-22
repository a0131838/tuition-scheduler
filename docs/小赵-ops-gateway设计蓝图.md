# 小赵 Ops Gateway 设计蓝图（最小可用版）

更新日期：2026-03-05  
目标：让小赵承担 Admin + 财务主执行工作，在不改变现有业务逻辑前提下，将错误风险降到最低。

---

## 1. 设计原则

1. 不替换现有页面与 API 逻辑，只新增旁路入口。
2. 小赵写操作必须通过统一网关；不允许分散写入。
3. 网关只编排和风控，实际业务仍调用现有服务/API。
4. 所有操作可审计、可回滚、可追责。

---

## 2. 系统边界

### 2.1 新增组件
- `Ops Gateway API`（建议路径：`/api/admin/ops/execute`）
- `Ops Audit Store`（操作请求、状态、证据、回滚元数据）

### 2.2 复用组件
- 现有 `app/api/admin/*` 业务接口
- 现有权限体系（ADMIN/FINANCE/MANAGER）
- 现有业务规则（排课冲突、课包有效性、票据审批）

### 2.3 明确不做
- 不重写排课/扣费/审批核心逻辑
- 不直接开放任意 SQL 执行入口

---

## 3. 操作生命周期（状态机）

状态：
1. `draft`
2. `preview_ready`
3. `approved`
4. `applied`
5. `failed`
6. `rolled_back`

强制规则：
1. `preview_ready` 前禁止 apply。
2. `approved` 需要确认短语匹配。
3. `applied` 后必须有复核证据。
4. 高风险操作必须记录回滚策略才可进入 `approved`。

---

## 4. 网关接口（MVP）

## 4.1 POST `/api/admin/ops/execute`
请求体：
```json
{
  "operationId": "OP-20260305-001",
  "mode": "preview",
  "taskType": "attendance.update_status",
  "actorRole": "ADMIN",
  "payload": {
    "sessionId": "...",
    "studentId": "...",
    "fromStatus": "PRESENT",
    "toStatus": "UNMARKED"
  },
  "safety": {
    "maxAffected": 1,
    "forceApply": false,
    "confirmPhrase": "CONFIRM OP-20260305-001"
  },
  "confirmationText": ""
}
```

响应体（preview）：
```json
{
  "ok": true,
  "operationId": "OP-20260305-001",
  "status": "preview_ready",
  "affectedCount": 1,
  "sampleIds": ["..."],
  "changesetPreview": [...],
  "riskLevel": "medium",
  "rollback": {
    "strategy": "restore_previous_status",
    "required": true
  }
}
```

响应体（apply）：
```json
{
  "ok": true,
  "operationId": "OP-20260305-001",
  "status": "applied",
  "affectedCount": 1,
  "verification": {
    "checked": true,
    "summary": "post-check passed"
  }
}
```

## 4.2 约束
- `mode=apply` 必须满足：
  - `forceApply=true`
  - `confirmationText === confirmPhrase`
  - `affectedCount <= maxAffected`

---

## 5. 白名单任务（第一批）

## 5.1 Admin
1. `attendance.update_status`
2. `session.replace_teacher_single`
3. `session.reschedule_single`
4. `ticket.append_followup_note`
5. `booking_request.approve_or_reject`

## 5.2 财务
1. `package_txn.update_note_only`
2. `receipt_approval.update_status`
3. `partner_settlement.mark_exported`
4. `payroll.regenerate_preview`
5. `undeducted_completed.mark_processed`

白名单外任务：仅允许只读分析，不允许写入。

---

## 6. 风控矩阵（MVP）

1. 影响条数超限：拒绝。
2. 高风险字段改动（金额、分钟数、票据号、课次时间）：
   - 升级 `riskLevel=high`
   - 必须人工确认。
3. 跨月历史数据改动：默认拒绝，需主管级别审批。
4. 批量删除：MVP 直接禁用。

---

## 7. 审计数据结构（建议）

表：`ops_operation_log`
字段建议：
1. `operation_id` (unique)
2. `task_type`
3. `mode` (preview/apply)
4. `actor` (user/email/channel)
5. `actor_role`
6. `status`
7. `payload_json`
8. `affected_count`
9. `sample_ids_json`
10. `changeset_preview_json`
11. `confirm_phrase_hash`
12. `confirmation_text_hash`
13. `rollback_strategy`
14. `verification_json`
15. `created_at` / `applied_at`

---

## 8. 回滚策略（第一批）

1. 状态字段改动：保存前值快照，支持单次回写。
2. 备注类改动：保存原备注数组。
3. 审批状态改动：保存原状态与审批人信息。
4. 无可逆改动（例如外部导出后不可撤回）：标注“需人工补偿流程”。

---

## 9. 小赵执行输出规范（强制）

每次必须输出：
1. 目标与范围
2. 影响条数
3. 样本ID
4. 风险级别
5. 回滚方式
6. 执行后核验结论

---

## 10. 上线方案（不影响现有功能）

阶段 A：影子模式（只 Preview，不 Apply）
1. 网关接请求
2. 生成 preview 与审计日志
3. 不写业务数据

阶段 B：低风险任务开放 Apply
1. 仅对白名单中低风险任务开放
2. 保留人工确认

阶段 C：扩大覆盖面
1. 按任务类型逐步开放
2. 监控误操作率与回滚率

回退策略：
- 任意阶段可立即切回“只读影子模式”。

---

## 11. 验收指标（KPI）

1. 误操作率 < 0.5%
2. 需人工返工率逐周下降
3. 冲突闭环时长下降
4. 财务异常发现时延下降
5. 小赵执行任务占比逐步提升

---

## 12. 实施清单（下一步可开发）

1. 建 `ops_operation_log` 表（或等价日志存储）。
2. 新建 `/api/admin/ops/execute`，先支持 `mode=preview`。
3. 接入你现有的 `validate-op-request` 规则。
4. 实现首批 3 个 Admin + 2 个财务任务编排。
5. 影子模式运行 1 周，复盘后再开 apply。
