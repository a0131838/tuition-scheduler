import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { logAudit } from "@/lib/audit-log";
import { formatBusinessDateTime } from "@/lib/date-only";
import {
  canUseMiniappAcademicDesk,
  canUseMiniappApprovalDesk,
  cleanMiniappText,
  operationLabel,
  parseMiniappLimit,
  summarizeAuditMeta,
} from "@/lib/miniapp-staff-action-center";
import { prisma } from "@/lib/prisma";
import { allocateTicketNo, composeTicketSituation } from "@/lib/tickets";

const OPERATION_MODULES = [
  "miniapp",
  "schedule",
  "scheduling",
  "tickets",
  "expense-claims",
  "TEACHER_PAYROLL",
  "parent-communications",
  "leads",
  "teacher-reports",
];

const ACADEMIC_OPERATION_MODULES = OPERATION_MODULES.filter(
  (module) => module !== "expense-claims" && module !== "TEACHER_PAYROLL",
);

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const canAcademic = canUseMiniappAcademicDesk(auth.user);
  const canManager = await canUseMiniappApprovalDesk(auth.user);
  const ownOnly = auth.user.role === "TEACHER" && !auth.user.operationsAdmin;
  if (!canAcademic && !canManager && !ownOnly) return bad("Operation log permission required", 403);
  const url = new URL(req.url);
  const limit = parseMiniappLimit(url.searchParams.get("limit"), 60, 150);
  const rows = await prisma.auditLog.findMany({
    where: ownOnly
      ? { actorEmail: auth.user.email.toLowerCase() }
      : { OR: (auth.user.operationsAdmin ? ACADEMIC_OPERATION_MODULES : OPERATION_MODULES).map((module) => ({ module: { contains: module, mode: "insensitive" as const } })) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return ok({
    operations: rows.map((row) => ({
      id: row.id,
      title: operationLabel(row.module, row.action),
      actor: row.actorName || row.actorEmail,
      actorRole: row.actorRole || "",
      module: row.module,
      action: row.action,
      entityType: row.entityType || "",
      entityId: row.entityId || "",
      createdText: formatBusinessDateTime(row.createdAt),
      meta: summarizeAuditMeta(row.meta),
    })),
    capabilities: { canRequestCorrection: canAcademic || canManager },
  });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const canAcademic = canUseMiniappAcademicDesk(auth.user);
  const canManager = await canUseMiniappApprovalDesk(auth.user);
  if (!canAcademic && !canManager) return bad("Correction request permission required", 403);
  const body = await req.json().catch(() => null);
  const auditLogId = cleanMiniappText((body as any)?.auditLogId, 80);
  const reason = cleanMiniappText((body as any)?.reason, 1200);
  const expectedResult = cleanMiniappText((body as any)?.expectedResult, 1200);
  const studentId = cleanMiniappText((body as any)?.studentId, 80);
  if (!auditLogId || reason.length < 5 || expectedResult.length < 3) return bad("Please complete correction reason and expected result");
  const sourceLog = await prisma.auditLog.findUnique({ where: { id: auditLogId } });
  if (!sourceLog) return bad("Operation log not found", 404);
  const student = studentId ? await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, name: true } }) : null;
  const created = await prisma.$transaction(async (tx) => {
    const ticketNo = await allocateTicketNo(tx);
    return tx.ticket.create({
      data: {
        ticketNo,
        studentId: student?.id ?? null,
        source: "员工小程序",
        type: "操作纠正",
        priority: "24小时紧急",
        studentName: student?.name ?? sourceLog.entityType ?? "系统操作",
        status: "Exception",
        owner: "Jasmine",
        summary: composeTicketSituation({
          currentIssue: `原操作：${operationLabel(sourceLog.module, sourceLog.action)}\n操作人：${sourceLog.actorName || sourceLog.actorEmail}\n操作时间：${formatBusinessDateTime(sourceLog.createdAt)}\n申请原因：${reason}`,
          requiredAction: expectedResult,
          latestDeadlineText: "24小时内复核",
        }),
        risksNotes: `关联审计日志：${sourceLog.id}`,
        nextAction: "管理员核对原操作影响，必要时在原业务页执行纠正。",
        nextActionDue: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdByName: auth.user.name,
      },
    });
  });
  await logAudit({
    actor: auth.user,
    module: "miniapp-operations",
    action: "REQUEST_CORRECTION",
    entityType: "Ticket",
    entityId: created.id,
    meta: { ticketNo: created.ticketNo, sourceAuditLogId: sourceLog.id, expectedResult },
  });
  return ok({ ticket: { id: created.id, ticketNo: created.ticketNo } });
}
