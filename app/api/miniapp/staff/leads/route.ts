import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { logAudit } from "@/lib/audit-log";
import { formatBusinessDateTime } from "@/lib/date-only";
import {
  allocateLeadNo,
  LEAD_INTENT_LEVELS,
  LEAD_SOURCE_PLATFORMS,
  LEAD_SOURCE_TYPES,
  normalizeLeadFlexibleOption,
  normalizeLeadOption,
  parseLeadDateTime,
} from "@/lib/leads";
import { canUseMiniappLeadDesk, cleanMiniappText, parseMiniappLimit } from "@/lib/miniapp-staff-action-center";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappLeadDesk(auth.user)) return bad("Lead desk permission required", 403);
  const url = new URL(req.url);
  const q = cleanMiniappText(url.searchParams.get("q"), 80);
  const limit = parseMiniappLimit(url.searchParams.get("limit"), 80, 150);
  const leads = await prisma.lead.findMany({
    where: {
      isArchived: false,
      ...(q
        ? { OR: [
            { leadNo: { contains: q, mode: "insensitive" } },
            { studentName: { contains: q, mode: "insensitive" } },
            { parentName: { contains: q, mode: "insensitive" } },
            { parentWechat: { contains: q, mode: "insensitive" } },
            { parentPhone: { contains: q, mode: "insensitive" } },
          ] }
        : {}),
    },
    include: { followUps: { orderBy: { createdAt: "desc" }, take: 3 } },
    orderBy: [{ nextActionDue: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
  const now = new Date();
  return ok({
    options: { sourceTypes: LEAD_SOURCE_TYPES, sourcePlatforms: LEAD_SOURCE_PLATFORMS, intentLevels: LEAD_INTENT_LEVELS },
    leads: leads.map((lead) => ({
      id: lead.id,
      leadNo: lead.leadNo,
      studentName: lead.studentName,
      parentName: lead.parentName || "",
      parentWechat: lead.parentWechat || "",
      parentPhone: lead.parentPhone || "",
      grade: lead.grade || "",
      needs: lead.needs || "",
      latestSummary: lead.latestSummary || "",
      status: lead.status,
      intentLevel: lead.intentLevel,
      ownerName: lead.ownerName || "未分配",
      nextAction: lead.nextAction || "",
      nextActionText: lead.nextActionDue ? formatBusinessDateTime(lead.nextActionDue) : "",
      overdue: Boolean(lead.nextActionDue && lead.nextActionDue < now && !["Converted", "Lost"].includes(lead.status)),
      schedulingTicketId: lead.schedulingTicketId || "",
      evidenceSaved: /\[咨询截图\]/.test(lead.sourceDetail || ""),
      followUps: lead.followUps.map((row) => ({ content: row.content, actorName: row.actorName, createdText: formatBusinessDateTime(row.createdAt) })),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappLeadDesk(auth.user)) return bad("Lead desk permission required", 403);
  const body = await req.json().catch(() => null);
  const studentName = cleanMiniappText((body as any)?.studentName, 120);
  const initialContent = cleanMiniappText((body as any)?.initialContent, 2000);
  const sourceType = normalizeLeadOption((body as any)?.sourceType, LEAD_SOURCE_TYPES, "自媒体咨询");
  const sourcePlatform = normalizeLeadFlexibleOption((body as any)?.sourcePlatform, LEAD_SOURCE_PLATFORMS, "微信");
  const intentLevel = normalizeLeadOption((body as any)?.intentLevel, LEAD_INTENT_LEVELS, "Warm");
  const parentWechat = cleanMiniappText((body as any)?.parentWechat, 120);
  const parentPhone = cleanMiniappText((body as any)?.parentPhone, 80);
  const forceDuplicate = Boolean((body as any)?.forceDuplicate);
  if (!studentName || initialContent.length < 3) return bad("Student name and consultation content are required");
  if (!forceDuplicate && (parentWechat || parentPhone)) {
    const duplicate = await prisma.lead.findFirst({
      where: { OR: [
        ...(parentWechat ? [{ parentWechat: { equals: parentWechat, mode: "insensitive" as const } }] : []),
        ...(parentPhone ? [{ parentPhone: { equals: parentPhone, mode: "insensitive" as const } }] : []),
      ] },
      select: { id: true, leadNo: true, studentName: true },
      orderBy: { createdAt: "desc" },
    });
    if (duplicate) return bad("Possible duplicate lead", 409, { duplicate });
  }
  const nextAction = cleanMiniappText((body as any)?.nextAction, 500) || "联系家长确认学生情况和课程需求";
  const nextActionDue = parseLeadDateTime((body as any)?.nextActionDue) || new Date(Date.now() + 24 * 60 * 60 * 1000);
  const ownerName = cleanMiniappText((body as any)?.ownerName, 120) || auth.user.name;
  const created = await prisma.$transaction(async (tx) => {
    const leadNo = await allocateLeadNo(tx);
    const lead = await tx.lead.create({
      data: {
        leadNo,
        sourceType,
        sourcePlatform: sourcePlatform || null,
        sourceDetail: cleanMiniappText((body as any)?.sourceDetail, 1000) || "员工小程序快速录入",
        parentName: cleanMiniappText((body as any)?.parentName, 120) || null,
        parentWechat: parentWechat || null,
        parentPhone: parentPhone || null,
        studentName,
        grade: cleanMiniappText((body as any)?.grade, 40) || null,
        school: cleanMiniappText((body as any)?.school, 160) || null,
        target: cleanMiniappText((body as any)?.target, 1000) || null,
        needs: cleanMiniappText((body as any)?.needs, 2000) || initialContent,
        preferredCourse: cleanMiniappText((body as any)?.preferredCourse, 160) || null,
        urgency: cleanMiniappText((body as any)?.urgency, 120) || null,
        intentLevel,
        status: "New Lead",
        ownerName,
        assignedSalesName: ownerName,
        nextAction,
        nextActionDue,
        latestSummary: initialContent,
        createdByUserId: auth.user.id,
        createdByName: auth.user.name,
      },
    });
    await tx.leadFollowUp.create({
      data: { leadId: lead.id, actorUserId: auth.user.id, actorName: auth.user.name, actorRole: auth.user.role, channel: "微信", content: initialContent, nextAction, nextActionDue, nextStatus: "New Lead", intentLevelAfter: intentLevel },
    });
    return lead;
  });
  await logAudit({ actor: auth.user, module: "leads", action: "CREATE_MINIAPP", entityType: "Lead", entityId: created.id, meta: { leadNo: created.leadNo, studentName } });
  return ok({ lead: { id: created.id, leadNo: created.leadNo } });
}
