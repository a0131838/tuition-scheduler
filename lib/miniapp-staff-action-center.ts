import { isManagerUser } from "@/lib/auth";

export type MiniappStaffUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  teacherId?: string | null;
  workspaceAccesses?: Array<{ workspace: string }>;
  operationsAdmin?: boolean;
};

export function hasMiniappWorkspace(user: MiniappStaffUser, workspace: string) {
  return (user.workspaceAccesses ?? []).some((row) => row.workspace === workspace);
}

export function canUseMiniappAcademicDesk(user: MiniappStaffUser) {
  return Boolean(user.operationsAdmin) || user.role === "ADMIN" || user.role === "CS" || hasMiniappWorkspace(user, "CS");
}

export function canUseMiniappLeadDesk(user: MiniappStaffUser) {
  return (
    user.role === "ADMIN" ||
    Boolean(user.operationsAdmin) ||
    user.role === "CS" ||
    user.role === "SALES" ||
    hasMiniappWorkspace(user, "CS") ||
    hasMiniappWorkspace(user, "SALES")
  );
}

export async function canUseMiniappApprovalDesk(user: MiniappStaffUser) {
  if (user.operationsAdmin) return false;
  return isManagerUser({ role: user.role as any, email: user.email });
}

export function canUseMiniappRenewalDesk(user: MiniappStaffUser) {
  return !user.operationsAdmin && canUseMiniappAcademicDesk(user);
}

export function cleanMiniappText(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

export function parseMiniappLimit(value: unknown, fallback = 50, max = 200) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.round(parsed)));
}

export function operationLabel(module: string, action: string) {
  const key = `${module}:${action}`.toLowerCase();
  if (key.includes("expense") && key.includes("approve")) return "审批报销";
  if (key.includes("expense") && key.includes("reject")) return "退回报销";
  if (key.includes("teacher_payroll") && key.includes("manager_approve")) return "审批老师工资";
  if (key.includes("schedule") && key.includes("cancel")) return "取消课程";
  if (key.includes("schedule") && key.includes("replace")) return "更换老师";
  if (key.includes("schedule") && key.includes("reschedule")) return "调整课程时间";
  if (key.includes("ticket") && key.includes("create")) return "创建工单";
  if (key.includes("ticket") && key.includes("update")) return "更新工单";
  if (key.includes("lead") && key.includes("create")) return "录入新咨询";
  if (key.includes("report") && key.includes("submit")) return "提交教学报告";
  return action || module || "系统操作";
}

export function summarizeAuditMeta(meta: unknown) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  return Object.entries(meta as Record<string, unknown>)
    .filter(([key]) => !/(token|password|secret|authorization|signature|path)/i.test(key))
    .slice(0, 8)
    .map(([key, value]) => ({
      key,
      value:
        value === null || typeof value === "number" || typeof value === "boolean"
          ? String(value ?? "-")
          : typeof value === "string"
            ? value.slice(0, 160)
            : JSON.stringify(value).slice(0, 160),
    }));
}

export function isOpenTicketStatus(status: string | null | undefined) {
  return !["Completed", "Cancelled"].includes(String(status ?? ""));
}

export function isReportEditable(status: string | null | undefined, archivedAt?: Date | string | null) {
  return !archivedAt && !["EXEMPT", "FORWARDED"].includes(String(status ?? ""));
}
