import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { getApprovalInboxData } from "@/lib/approval-inbox";
import { getApprovalRoleConfig, isRoleApprover } from "@/lib/approval-flow";
import { logAudit } from "@/lib/audit-log";
import { approveExpenseClaim, canApproveExpense, rejectExpenseClaim } from "@/lib/expense-claims";
import { canUseMiniappApprovalDesk, cleanMiniappText } from "@/lib/miniapp-staff-action-center";
import { approvePackageInvoiceApproval, rejectPackageInvoiceApproval } from "@/lib/package-finance-gate";
import { managerApproveTeacherPayroll } from "@/lib/teacher-payroll";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!(await canUseMiniappApprovalDesk(auth.user))) return bad("Manager approval permission required", 403);
  const data = await getApprovalInboxData(auth.user.email, auth.user.role);
  return ok({
    summary: data.summary,
    items: data.items.filter((item) => item.lane === "MANAGER" || item.lane === "EXPENSE"),
    capabilities: data.visibility,
  });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!(await canUseMiniappApprovalDesk(auth.user))) return bad("Manager approval permission required", 403);
  const body = await req.json().catch(() => null);
  const type = cleanMiniappText((body as any)?.type, 40);
  const id = cleanMiniappText((body as any)?.id, 200);
  const decision = cleanMiniappText((body as any)?.decision, 20).toUpperCase();
  const reason = cleanMiniappText((body as any)?.reason, 1000);
  if (!type || !id || !["APPROVE", "REJECT"].includes(decision)) return bad("Invalid approval action");
  if (decision === "REJECT" && reason.length < 3) return bad("Reject reason is required");

  try {
    if (type === "PACKAGE_INVOICE") {
      if (decision === "APPROVE") await approvePackageInvoiceApproval({ approvalId: id, actorEmail: auth.user.email });
      else await rejectPackageInvoiceApproval({ approvalId: id, actorEmail: auth.user.email, rejectReason: reason });
    } else if (type === "EXPENSE_CLAIM") {
      if (!(await canApproveExpense(auth.user))) return bad("Expense approval permission required", 403);
      if (decision === "APPROVE") await approveExpenseClaim({ claimId: id, approver: auth.user });
      else await rejectExpenseClaim({ claimId: id, reason, approver: auth.user });
    } else if (type === "TEACHER_PAYROLL") {
      if (decision !== "APPROVE") return bad("Payroll rejection stays in the full web payroll desk", 409);
      const [teacherId, month, scope = "all"] = id.split(":");
      const cfg = await getApprovalRoleConfig();
      if (!isRoleApprover(auth.user.email, cfg.managerApproverEmails)) return bad("Payroll approver permission required", 403);
      const approved = await managerApproveTeacherPayroll({ teacherId, month, scope, approverEmail: auth.user.email, allManagerApproverEmails: cfg.managerApproverEmails });
      if (!approved) return bad("Payroll is no longer ready for approval", 409);
    } else {
      return bad("This approval remains available in the full web desk", 409);
    }
    await logAudit({
      actor: auth.user,
      module: "miniapp-approvals",
      action: decision,
      entityType: type,
      entityId: id,
      meta: reason ? { reason } : undefined,
    });
    return ok({ completed: true });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Approval failed", 409);
  }
}
