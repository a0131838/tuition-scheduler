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

test("web Ticket Center exposes one state-specific primary action and keeps manual recovery disclosed", () => {
  const source = readFileSync(new URL("../app/admin/tickets/[id]/page.tsx", import.meta.url), "utf8");
  const submitSource = readFileSync(new URL("../app/admin/tickets/[id]/AiPlanSubmitButton.tsx", import.meta.url), "utf8");
  assert.match(source, /AI处理建议 · 不直接修改正式数据/);
  assert.match(source, /核对AI建议并进入正式执行/);
  assert.match(source, /人工手动处理（始终保留）/);
  assert.match(source, /AI不适用、系统外已处理或需要人工例外/);
  assert.match(source, /AI只负责读取、核对和准备建议/);
  assert.match(source, /前期不会自动落课、扣课时、改考勤、算工资或发送真实消息/);
  assert.match(source, /AiPlanSubmitButton/);
  assert.match(submitSource, /useFormStatus\(\)/);
  assert.doesNotMatch(submitSource, /onClick=.*setPending/);
  assert.match(submitSource, /AI正在读取，请稍候/);
  assert.match(submitSource, /disabled=\{pending\}/);
  assert.doesNotMatch(source, /operations\.slice\(0, 12\)/);
  const integration = readFileSync(new URL("../lib/admin-ai-ticket-plan.ts", import.meta.url), "utf8");
  assert.match(integration, /AI连接暂时不可用，请点击重新读取/);
  assert.doesNotMatch(integration, /throw new Error\(message\).*Failed to fetch/);
  const miniapp = readFileSync(new URL("../miniapp/boss-academic-parent/pages/staff-ai-work/staff-ai-work.js", import.meta.url), "utf8");
  assert.match(miniapp, /formalActionResolution\?\.allResolved/);
  assert.match(miniapp, /核验正式结果并关闭/);
  assert.match(miniapp, /AI不会重复执行/);
});
