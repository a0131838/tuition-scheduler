import { prisma } from "@/lib/prisma";
import { logParentPortalAudit } from "@/lib/parent-portal";
import { miniappRequestConfig, miniappRequestDto, normalizeMiniappRequestType } from "@/lib/miniapp-parent-requests";
import { allocateTicketNo, composeTicketSituation, normalizeTicketString } from "@/lib/tickets";
import { bad, ok, requireMiniappStudentAccess } from "../../../_lib";

function cleanString(v: unknown, maxLen = 2000) {
  return normalizeTicketString(v, maxLen) ?? "";
}

function requestCaseKey(ticket: { type: string; summary: string | null; createdAt: Date; schedulingActions?: { sourceSessionId: string | null; courseLabel: string | null }[] }) {
  const targets = (ticket.schedulingActions || []).map((row) => row.sourceSessionId).filter(Boolean).sort().join(",");
  const course = (ticket.schedulingActions || []).map((row) => row.courseLabel).find(Boolean) || "";
  const fourteenDayBucket = Math.floor(ticket.createdAt.getTime() / (14 * 86_400_000));
  return targets ? `session:${targets}` : `request:${ticket.type}:${course}:${fourteenDayBucket}`;
}

function consolidateParentRequests<T extends { id: string; status: string; type: string; summary: string | null; createdAt: Date; schedulingActions?: { sourceSessionId: string | null; courseLabel: string | null }[] }>(tickets: T[]) {
  const closed = new Set(["Completed", "Cancelled"]);
  const groups = new Map<string, T[]>();
  for (const ticket of tickets) {
    if (closed.has(ticket.status)) continue;
    const key = requestCaseKey(ticket);
    groups.set(key, [...(groups.get(key) || []), ticket]);
  }
  const hidden = new Set<string>();
  const metadata = new Map<string, { submissionCount: number; mergedTicketIds: string[]; consolidated: boolean }>();
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    members.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    members.slice(1).forEach((item) => hidden.add(item.id));
    metadata.set(members[0].id, { submissionCount: members.length, mergedTicketIds: members.map((item) => item.id), consolidated: true });
  }
  return tickets.filter((ticket) => !hidden.has(ticket.id)).map((ticket) => ({ ticket, group: metadata.get(ticket.id) || null }));
}

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canCreateRequests");
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim();
  const tickets = await prisma.ticket.findMany({
    where: {
      studentId,
      source: "家长小程序",
      parentVisible: true,
      isArchived: false,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { schedulingActions: { select: { sourceSessionId: true, courseLabel: true } } },
  });

  return ok({ requests: consolidateParentRequests(tickets).map(({ ticket, group }) => ({
    ...miniappRequestDto(ticket),
    caseGroup: group,
    statusDetail: group ? `已将${group.submissionCount}次相关提交合并处理，原始记录均已保留。` : null,
  })) });
}

export async function POST(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canCreateRequests");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");

  const type = normalizeMiniappRequestType((body as any).type);
  const content = cleanString((body as any).content, 2000);
  const requiredAction = cleanString((body as any).requiredAction, 1000);
  const latestDeadlineText = cleanString((body as any).latestDeadlineText, 200);
  const contactPhone = cleanString((body as any).contactPhone, 80);
  const contactWechat = cleanString((body as any).contactWechat, 120);
  const urgency = cleanString((body as any).urgency, 20) === "URGENT" ? "URGENT" : "ROUTINE";
  if (!content) return bad("Content is required");

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, grade: true },
  });
  if (!student) return bad("Student not found", 404);

  const cfg = miniappRequestConfig(type);
  const parentLabel = auth.parent.name || auth.parent.phone || auth.parent.wechatOpenId || "家长";
  const summary = composeTicketSituation({
    currentIssue: content,
    requiredAction: requiredAction || "请工作人员跟进家长提交的请求。",
    latestDeadlineText: latestDeadlineText || "尽快跟进",
  });

  const ticket = await prisma.$transaction(async (tx) => {
    const ticketNo = await allocateTicketNo(tx);
    return tx.ticket.create({
      data: {
        ticketNo,
        studentId: student.id,
        source: "家长小程序",
        type,
        priority: urgency === "URGENT" ? "24小时紧急" : cfg.priority,
        studentName: student.name,
        grade: student.grade,
        wechat: contactWechat || auth.parent.wechatOpenId || null,
        phone: contactPhone || auth.parent.phone || null,
        status: "Need Info",
        owner: cfg.owner,
        version: "V1",
        systemUpdated: "N",
        lastUpdateAt: new Date(),
        summary,
        parentVisible: true,
        parentPublicSummary: content,
        parentCommunicationSource: "家长小程序",
        nextAction: "工作人员跟进家长请求",
        proof: null,
        createdByName: `家长小程序：${parentLabel}`,
      },
    });
  });

  await logParentPortalAudit({
    parentId: auth.parent.id,
    studentId,
    action: "miniapp.request.create",
    targetType: "Ticket",
    targetId: ticket.id,
    meta: { type, urgency, ticketNo: ticket.ticketNo, owner: cfg.owner, closeOwner: cfg.closer },
  }).catch(() => null);

  return ok({
    message: "我们已收到你的请求，工作人员会尽快跟进。",
    request: miniappRequestDto(ticket),
  });
}
