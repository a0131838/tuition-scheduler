import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { formatBusinessDateTime } from "@/lib/date-only";
import {
  canTeachMiniappSession,
  getMiniappStaffSessionContext,
  miniappStaffSessionCourseLabel,
  miniappStaffSessionStudents,
} from "@/lib/miniapp-staff-session";
import { prisma } from "@/lib/prisma";
import { allocateTicketNo, composeTicketSituation } from "@/lib/tickets";

function clean(value: unknown, maxLen: number) {
  return String(value ?? "").trim().slice(0, maxLen);
}

function marker(sessionId: string) {
  return `[MINIAPP_TEACHER_RESCHEDULE_SESSION:${sessionId}]`;
}

async function context(req: Request, sessionId: string) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth;
  const session = await getMiniappStaffSessionContext(sessionId);
  if (!session || !canTeachMiniappSession(auth.user, session)) {
    return { ok: false as const, response: bad("Only the assigned lesson teacher can submit this request", 403) };
  }
  if (session.startAt <= new Date()) {
    return { ok: false as const, response: bad("Only future lessons can be rescheduled here", 409) };
  }
  return { ok: true as const, auth, session };
}

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  const access = await context(req, sessionId);
  if (!access.ok) return access.response;
  const students = miniappStaffSessionStudents(access.session);
  const existing = await prisma.ticket.findFirst({
    where: {
      type: "改课程时间",
      isArchived: false,
      status: { notIn: ["Completed", "Cancelled"] },
      risksNotes: { contains: marker(sessionId) },
    },
    select: { id: true, ticketNo: true, status: true, owner: true, nextAction: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return ok({
    students: students.map((student) => ({ id: student.id, name: student.name })),
    existing: existing ? { ...existing, updatedAtText: formatBusinessDateTime(existing.updatedAt) } : null,
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  const access = await context(req, sessionId);
  if (!access.ok) return access.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const students = miniappStaffSessionStudents(access.session);
  const studentId = clean((body as any).studentId, 80);
  const student = students.find((row) => row.id === studentId);
  if (!student) return bad("Student is not in this lesson", 409);
  const reason = clean((body as any).reason, 1000);
  const preferredDate = clean((body as any).preferredDate, 20);
  const preferredTime = clean((body as any).preferredTime, 20);
  if (!reason) return bad("Reschedule reason is required", 409);
  if ((preferredDate && !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) || (preferredTime && !/^\d{2}:\d{2}$/.test(preferredTime))) {
    return bad("Invalid preferred date or time", 409);
  }

  const teacherName = access.session.teacher?.name ?? access.session.class.teacher.name;
  const courseLabel = miniappStaffSessionCourseLabel(access.session);
  const requestedText = preferredDate || preferredTime ? `${preferredDate || "日期待定"} ${preferredTime || "时间待定"}` : "未指定，由教务协调";
  const now = new Date();
  const due = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const log = `[${formatBusinessDateTime(now)}] ${teacherName} · 老师移动端调课申请\n原因：${reason}\n建议时间：${requestedText}`;
  const tag = marker(sessionId);
  const existing = await prisma.ticket.findFirst({
    where: { type: "改课程时间", isArchived: false, status: { notIn: ["Completed", "Cancelled"] }, risksNotes: { contains: tag } },
    orderBy: { createdAt: "desc" },
  });

  const ticket = await prisma.$transaction(async (tx) => {
    const saved = existing
      ? await tx.ticket.update({
          where: { id: existing.id },
          data: {
            status: "Need Info",
            owner: existing.owner || "Jasmine",
            teacher: teacherName,
            nextAction: "Jasmine/Eva 联系家长并根据老师建议时间完成调课协调。",
            nextActionDue: due,
            lastUpdateAt: now,
            risksNotes: `${String(existing.risksNotes ?? "").trim()}\n\n${log}`.trim(),
          },
        })
      : await tx.ticket.create({
          data: {
            ticketNo: await allocateTicketNo(tx),
            studentId: student.id,
            studentName: student.name,
            source: "老师小程序",
            type: "改课程时间",
            priority: "24小时紧急",
            course: courseLabel,
            teacher: teacherName,
            poc: teacherName,
            status: "Need Info",
            owner: "Jasmine",
            version: "V1",
            systemUpdated: "N",
            summary: composeTicketSituation({
              currentIssue: `老师申请调整 ${formatBusinessDateTime(access.session.startAt)} 的课程。原因：${reason}`,
              requiredAction: `联系家长确认新时间。老师建议：${requestedText}。`,
              latestDeadlineText: formatBusinessDateTime(due),
            }),
            nextAction: "Jasmine/Eva 联系家长并根据老师建议时间完成调课协调。",
            nextActionDue: due,
            risksNotes: `${tag}\n${log}`,
            createdByName: `老师移动端：${teacherName}`,
            lastUpdateAt: now,
          },
        });
    await tx.auditLog.create({
      data: {
        actorEmail: access.auth.user.email.trim().toLowerCase(),
        actorName: access.auth.user.name?.trim() || null,
        actorRole: access.auth.user.role,
        module: "TICKETS",
        action: existing ? "MINIAPP_TEACHER_RESCHEDULE_REQUEST_UPDATE" : "MINIAPP_TEACHER_RESCHEDULE_REQUEST_CREATE",
        entityType: "Ticket",
        entityId: saved.id,
        meta: { sessionId, studentId: student.id, preferredDate: preferredDate || null, preferredTime: preferredTime || null },
      },
    });
    return saved;
  });
  return ok({ message: existing ? "调课申请已补充并重新提交。" : "调课申请已提交给 Jasmine/Eva。", ticket: { id: ticket.id, ticketNo: ticket.ticketNo, status: ticket.status, owner: ticket.owner } });
}
