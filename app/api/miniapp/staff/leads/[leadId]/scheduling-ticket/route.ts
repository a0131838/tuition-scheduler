import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { logAudit } from "@/lib/audit-log";
import { canUseMiniappLeadDesk, cleanMiniappText } from "@/lib/miniapp-staff-action-center";
import { prisma } from "@/lib/prisma";
import { allocateTicketNo, composeTicketSituation } from "@/lib/tickets";

export async function POST(req: Request, context: { params: Promise<{ leadId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappLeadDesk(auth.user)) return bad("Lead desk permission required", 403);
  const { leadId } = await context.params;
  const body = await req.json().catch(() => null);
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return bad("Lead not found", 404);
  if (lead.schedulingTicketId) return ok({ ticket: { id: lead.schedulingTicketId }, reused: true });
  const requestText = cleanMiniappText((body as any)?.requestText, 1000) || lead.needs || lead.latestSummary || "请教务联系家长确认评估或首次排课安排。";
  const ticket = await prisma.$transaction(async (tx) => {
    const ticketNo = await allocateTicketNo(tx);
    const created = await tx.ticket.create({
      data: {
        ticketNo,
        source: "新咨询资源",
        type: "排课协调",
        priority: lead.intentLevel === "Hot" ? "6小时紧急" : "24小时紧急",
        studentName: lead.studentName,
        grade: lead.grade,
        course: lead.preferredCourse,
        wechat: lead.parentWechat,
        phone: lead.parentPhone,
        status: "Need Info",
        owner: "Eva",
        summary: composeTicketSituation({ currentIssue: requestText, requiredAction: "确认课程、老师、家长可用时间后安排评估或首课。", latestDeadlineText: "尽快跟进" }),
        nextAction: "联系家长并完成排课条件确认",
        nextActionDue: new Date(Date.now() + (lead.intentLevel === "Hot" ? 6 : 24) * 60 * 60 * 1000),
        createdByName: auth.user.name,
      },
    });
    await tx.lead.update({ where: { id: lead.id }, data: { schedulingTicketId: created.id, status: "Scheduling", nextAction: "跟进排课协调工单" } });
    return created;
  });
  await logAudit({ actor: auth.user, module: "leads", action: "CREATE_SCHEDULING_TICKET", entityType: "Ticket", entityId: ticket.id, meta: { leadId: lead.id, leadNo: lead.leadNo, ticketNo: ticket.ticketNo } });
  return ok({ ticket: { id: ticket.id, ticketNo: ticket.ticketNo }, reused: false });
}
