import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { normalizeAdminAiTicketPlan } from "../lib/admin-ai-ticket-plan";

test("formal web ticket normalizes the shared AI OS execution plan without reinterpreting it", () => {
  const plan = normalizeAdminAiTicketPlan({
    intakeId: "intake-1",
    formalTicketId: "ticket-1",
    intentGroup: "RESCHEDULE",
    confidence: 0.92,
    semanticCommand: { canonicalRequestText: "把8月18日16:00课程改到8月19日17:00。" },
    consistencyCheck: { status: "CONSISTENT" },
    workflowPlan: { workflowKey: "RESCHEDULE" },
    executionPreview: {
      nextHumanGate: "员工核对后执行",
      operations: [{ sequence: 1, commandType: "RESCHEDULE_SESSION", startAt: "2026-08-19T17:00:00+08:00", teacherName: "Suzanne" }],
      blockers: [],
    },
  });

  assert.ok(plan);
  assert.equal(plan.workflowLabel, "修改课程时间");
  assert.equal(plan.confidencePercent, 92);
  assert.equal(plan.canonicalRequestText, "把8月18日16:00课程改到8月19日17:00。");
  assert.equal(plan.preparationStatus, "READY");
  assert.deepEqual(plan.operations[0], {
    sequence: 1,
    commandType: "RESCHEDULE_SESSION",
    startAt: "2026-08-19T17:00:00+08:00",
    teacherName: "Suzanne",
    targetId: null,
  });
});

test("AI blockers remain explicit and never become a ready-to-execute plan", () => {
  const plan = normalizeAdminAiTicketPlan({
    intakeId: "intake-2",
    formalTicketId: "ticket-2",
    intentGroup: "NEW_SCHEDULE",
    confidence: 0.68,
    consistencyCheck: { status: "HUMAN_CONFIRMATION_REQUIRED" },
    executionPreview: {
      operations: [],
      blockers: [{ code: "NO_TEACHER", title: "没有合适老师", detail: "现有老师时间不匹配", action: "请教务选择老师" }],
    },
  });

  assert.ok(plan);
  assert.equal(plan.preparationStatus, "BLOCKED");
  assert.equal(plan.consistencyNeedsConfirmation, true);
  assert.equal(plan.blockers[0]?.action, "请教务选择老师");
});

test("web Ticket Center permanently keeps AI-guided and manual execution paths", () => {
  const source = readFileSync(new URL("../app/admin/tickets/[id]/page.tsx", import.meta.url), "utf8");
  const submitSource = readFileSync(new URL("../app/admin/tickets/[id]/AiPlanSubmitButton.tsx", import.meta.url), "utf8");
  assert.match(source, /AI处理建议 · 不直接修改正式数据/);
  assert.match(source, /按AI建议，由员工正式执行/);
  assert.match(source, /人工手动处理（始终保留）/);
  assert.match(source, /AI只负责读取、核对和准备建议/);
  assert.match(source, /前期不会自动落课、扣课时、改考勤、算工资或发送真实消息/);
  assert.match(source, /AiPlanSubmitButton/);
  assert.match(submitSource, /useFormStatus\(\)/);
  assert.doesNotMatch(submitSource, /onClick=.*setPending/);
  assert.match(submitSource, /AI正在读取，请稍候/);
  assert.match(submitSource, /disabled=\{pending\}/);
});
