import { isManagerUser, isOwnerManager } from "@/lib/auth";
import { issueAiMiniappDelegation } from "@/lib/ai-miniapp-delegation";
import type { SystemUserRole } from "@/lib/staff-roles";

type FormalStaffUser = {
  id: string;
  name: string | null;
  email: string;
  role: SystemUserRole;
  operationsAdmin?: boolean;
};

export type AdminAiTicketOperation = {
  sequence: number;
  commandType: string;
  startAt: string | null;
  teacherName: string | null;
  targetId: string | null;
};

export type AdminAiTicketBlocker = {
  code: string;
  title: string;
  detail: string;
  action: string;
};

export type AdminAiTicketPlan = {
  intakeId: string;
  formalTicketId: string;
  workflowKey: string;
  workflowLabel: string;
  confidencePercent: number;
  canonicalRequestText: string;
  consistencyNeedsConfirmation: boolean;
  updatedAt: string | null;
  preparationStatus: "NOT_PREPARED" | "READY" | "BLOCKED";
  nextHumanGate: string;
  operations: AdminAiTicketOperation[];
  blockers: AdminAiTicketBlocker[];
};

export type AdminAiTicketPlanResult =
  | { status: "READY"; plan: AdminAiTicketPlan }
  | { status: "NOT_FOUND"; message: string }
  | { status: "UNAVAILABLE"; message: string };

const WORKFLOW_LABELS: Record<string, string> = {
  NEW_SCHEDULE: "新学生排课",
  SUPPLEMENTARY: "补课或加课",
  RESCHEDULE: "修改课程时间",
  CANCEL_LESSON: "取消课程",
  CHANGE_TEACHER: "更换老师",
  ASSESSMENT_TRIAL: "评估与试听",
  PACKAGE_SALES_ACTIVATION: "课包申请与激活",
  ACADEMIC_CASE: "学术问题",
  NON_ACADEMIC_SERVICE: "客服事项",
  OPERATION_CORRECTION: "系统记录纠正",
};

export const AI_TICKET_COMMAND_LABELS: Record<string, string> = {
  CREATE_SESSION: "新增课程",
  RESCHEDULE_SESSION: "调整课程时间",
  CANCEL_SESSION: "取消课程",
  REPLACE_TEACHER: "更换老师",
  CHANGE_SESSION_LOCATION: "调整上课方式或地点",
  CREATE_ASSESSMENT_TASK: "建立评估任务",
  PACKAGE_ACTIVATION_REVIEW: "核对课包申请",
  ACADEMIC_CASE_HANDOFF: "建立学术处理任务",
  SERVICE_CASE_HANDOFF: "建立客服处理任务",
  OPERATION_CORRECTION_REVIEW: "建立记录纠正核验",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeOperation(value: unknown, index: number): AdminAiTicketOperation {
  const row = asRecord(value);
  return {
    sequence: Number(row.sequence) || index + 1,
    commandType: asString(row.commandType) || "UNKNOWN",
    startAt: asString(row.startAt) || null,
    teacherName: asString(row.teacherName) || null,
    targetId: asString(row.targetId) || null,
  };
}

function normalizeBlocker(value: unknown): AdminAiTicketBlocker {
  const row = asRecord(value);
  return {
    code: asString(row.code) || "AI_PLAN_BLOCKED",
    title: asString(row.title) || asString(row.label) || "还有一项条件需要人工处理",
    detail: asString(row.detail) || asString(row.message) || "请查看完整方案。",
    action: asString(row.action) || "处理后重新生成AI方案。",
  };
}

export function normalizeAdminAiTicketPlan(value: unknown): AdminAiTicketPlan | null {
  const item = asRecord(value);
  const intakeId = asString(item.intakeId);
  const formalTicketId = asString(item.formalTicketId);
  if (!intakeId || !formalTicketId) return null;

  const semanticCommand = asRecord(item.semanticCommand);
  const consistencyCheck = asRecord(item.consistencyCheck);
  const workflowPlan = asRecord(item.workflowPlan);
  const operation = asRecord(item.operation);
  const preview = asRecord(item.executionPreview);
  const operations = asArray(preview.operations).map(normalizeOperation);
  const blockers = asArray(preview.blockers).map(normalizeBlocker);
  const workflowKey = asString(workflowPlan.workflowKey) || asString(operation.workflowKey) || asString(item.intentGroup) || "UNKNOWN";
  const confidence = Number(item.confidence);

  return {
    intakeId,
    formalTicketId,
    workflowKey,
    workflowLabel: asString(item.intentSubtype) || asString(workflowPlan.workflowLabel) || WORKFLOW_LABELS[workflowKey] || "工单处理",
    confidencePercent: Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence * 100))) : 0,
    canonicalRequestText: asString(semanticCommand.canonicalRequestText) || asString(item.displayMessage) || "AI正在整理完整需求。",
    consistencyNeedsConfirmation: asString(consistencyCheck.status) === "HUMAN_CONFIRMATION_REQUIRED",
    updatedAt: asString(item.updatedAt) || null,
    preparationStatus: !Object.keys(preview).length ? "NOT_PREPARED" : blockers.length ? "BLOCKED" : "READY",
    nextHumanGate: asString(preview.nextHumanGate) || "员工核对后进入正式系统执行",
    operations,
    blockers,
  };
}

export async function aiRoleForAdminAi(user: FormalStaffUser) {
  if (isOwnerManager(user)) return "OWNER";
  if (user.operationsAdmin) return "ACADEMIC";
  if (user.role === "FINANCE") return "MANAGER_FINANCE";
  if (user.role === "CS" || user.role === "SALES") return "CUSTOMER_SERVICE";
  if (user.role === "TEACHER") return "VIEWER";
  if (user.role === "ADMIN" && await isManagerUser(user)) return "MANAGER";
  if (user.role === "ADMIN") return "ACADEMIC";
  throw new Error("当前账号不能使用AI工单方案。");
}

function integrationConfig() {
  const baseUrl = String(process.env.SGT_AI_BASE_URL || "https://gtaisg.com").trim().replace(/\/$/, "");
  const secret = String(process.env.SGT_AI_MINIAPP_SHARED_SECRET || "").trim();
  if (!baseUrl || secret.length < 32) throw new Error("AI工单服务尚未配置。");
  return { baseUrl, secret };
}

async function aiToken(user: FormalStaffUser) {
  const { secret } = integrationConfig();
  return issueAiMiniappDelegation({ ...user, aiRole: await aiRoleForAdminAi(user) }, secret);
}

async function callAi(user: FormalStaffUser, path: string, init?: RequestInit, timeoutMs = 8_000) {
  const { baseUrl } = integrationConfig();
  const token = await aiToken(user);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/failed to fetch|networkerror|load failed|abort|timeout/i.test(message)) {
      throw new Error("AI连接暂时不可用，请点击重新读取；系统不会保存不完整结果。");
    }
    throw new Error("AI工单服务暂时不可用，请稍后重新读取。");
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = asString(asRecord(result).error) || "AI工单服务暂时不可用。";
    if (/failed to fetch|networkerror|load failed|abort|timeout/i.test(message)) {
      throw new Error("AI连接暂时不可用，请点击重新读取；系统不会保存不完整结果。");
    }
    throw new Error(message);
  }
  return asRecord(result);
}

export async function readAdminAiTicketPlan(user: FormalStaffUser, ticketId: string): Promise<AdminAiTicketPlanResult> {
  try {
    const result = await callAi(user, `/api/miniapp-ai/ticket-operations?id=${encodeURIComponent(ticketId)}`, undefined, 5_000);
    const plan = asArray(result.items)
      .map(normalizeAdminAiTicketPlan)
      .find((item): item is AdminAiTicketPlan => Boolean(item && item.formalTicketId === ticketId));
    return plan
      ? { status: "READY", plan }
      : { status: "NOT_FOUND", message: "这张工单还没有AI方案，可让AI先读取并准备。" };
  } catch (error) {
    return { status: "UNAVAILABLE", message: error instanceof Error ? error.message : "AI工单服务暂时不可用。" };
  }
}

export async function prepareAdminAiTicketPlan(user: FormalStaffUser, ticketId: string) {
  const refreshed = await callAi(user, "/api/miniapp-ai/refresh-ticket", {
    method: "POST",
    body: JSON.stringify({ ticketId }),
  }, 45_000);
  const refreshedItem = normalizeAdminAiTicketPlan(refreshed.item);
  if (!refreshedItem) throw new Error("AI没有找到这张正式工单，请稍后重试。");
  await callAi(user, "/api/miniapp-ai/autopilot", {
    method: "POST",
    body: JSON.stringify({ intakeId: refreshedItem.intakeId }),
  }, 30_000);
}
