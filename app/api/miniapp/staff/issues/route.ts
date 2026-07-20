import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { allocateTicketNo, composeTicketSituation } from "@/lib/tickets";

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, max);
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null) as any;
  if (!body) return bad("Invalid request");
  const description = clean(body.description, 2000);
  const expected = clean(body.expected, 1000);
  const page = clean(body.page, 300);
  const severity = ["一般", "影响工作", "紧急"].includes(clean(body.severity, 20)) ? clean(body.severity, 20) : "影响工作";
  if (description.length < 5) return bad("请说明发生了什么");
  const context = body.context && typeof body.context === "object" ? body.context : {};
  const ticket = await prisma.$transaction(async (tx) => {
    const ticketNo = await allocateTicketNo(tx);
    return tx.ticket.create({
      data: {
        ticketNo,
        source: "员工小程序",
        type: "系统问题",
        priority: severity === "紧急" ? "1小时紧急" : severity === "影响工作" ? "6小时紧急" : "24小时紧急",
        studentName: "系统问题",
        status: "Exception",
        owner: "Jasmine",
        summary: composeTicketSituation({ currentIssue: `页面：${page || "未知"}\n问题：${description}`, requiredAction: expected || "技术人员复现、定位并反馈处理结果。", latestDeadlineText: severity }),
        risksNotes: JSON.stringify({ reporter: auth.user.name, reporterRole: auth.user.role, context }).slice(0, 5000),
        nextAction: "核对客户端上下文和最近操作，复现后创建修复记录。",
        nextActionDue: new Date(Date.now() + (severity === "紧急" ? 60 : severity === "影响工作" ? 360 : 1440) * 60 * 1000),
        createdByName: auth.user.name || auth.user.email,
        lastUpdateAt: new Date(),
      },
    });
  });
  await logAudit({ actor: auth.user, module: "miniapp-issue-report", action: "REPORT_MINIAPP_ISSUE", entityType: "Ticket", entityId: ticket.id, meta: { ticketNo: ticket.ticketNo, page, severity, clientVersion: context.clientVersion } });
  return ok({ ticket: { id: ticket.id, ticketNo: ticket.ticketNo }, message: "问题已提交" });
}
