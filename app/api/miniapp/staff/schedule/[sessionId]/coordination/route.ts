import { bad, ok } from "@/app/api/miniapp/_lib";
import { Prisma } from "@prisma/client";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { logAudit } from "@/lib/audit-log";
import {
  canAccessMiniappStaffSession,
  canManageMiniappSchedulingCoordination,
  getMiniappStaffSessionContext,
  miniappStaffSessionCourseLabel,
  miniappStaffSessionStudents,
} from "@/lib/miniapp-staff-session";
import { miniappRequestStatusLabel } from "@/lib/miniapp-parent-requests";
import {
  buildParentAvailabilityExpiresAt,
  buildParentAvailabilityPath,
  createParentAvailabilityToken,
} from "@/lib/parent-availability";
import { prisma } from "@/lib/prisma";
import {
  normalizeSchedulingCoordinationCourseKey,
  schedulingCoordinationCourseLabelsMatch,
  schedulingCoordinationCurrentIssueText,
  schedulingCoordinationInitialRequiredActionText,
} from "@/lib/scheduling-coordination";
import {
  allocateTicketNo,
  canTransitionTicketStatus,
  composeTicketSituation,
  normalizeTicketString,
  SCHEDULING_COORDINATION_TICKET_TYPE,
} from "@/lib/tickets";

const COMMUNICATION_TARGETS = ["家长", "老师", "家长和老师", "内部协调"] as const;
const COORDINATION_STATUSES = ["Waiting Parent", "Waiting Teacher", "Confirmed", "Exception"] as const;

function resolveTicketSource(student: { sourceChannel: { name: string } | null }) {
  const raw = String(student.sourceChannel?.name ?? "").trim();
  if (raw.includes("新东方")) return "新东方外包";
  if (raw.includes("上海新卓思")) return "上海新卓思外包";
  return "自营学生";
}

function pickOwner(user: { name?: string | null; email?: string | null }) {
  const source = `${user.name ?? ""} ${user.email ?? ""}`.toLowerCase();
  if (source.includes("eva")) return "Eva";
  if (source.includes("emily")) return "Emily";
  if (source.includes("jasmine")) return "Jasmine";
  return "Jasmine";
}

function cleanString(value: unknown, maxLen: number) {
  return normalizeTicketString(value, maxLen) ?? "";
}

function parseFollowUpDate(value: unknown) {
  const raw = cleanString(value, 20);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T18:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function defaultNextAction(status: string) {
  if (status === "Waiting Teacher") return "等待老师回复可排时间或确认特殊时间。";
  if (status === "Confirmed") return "进入后台完成正式排课并复核课程安排。";
  if (status === "Exception") return "由 Jasmine 跟进排课异常并确认下一步方案。";
  return "等待家长回复可上课时间或确认候选时段。";
}

function publicBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "https://sgtmanage.com").replace(/\/$/, "");
}

function activeAvailabilityUrl(request: {
  token: string;
  isActive: boolean;
  expiresAt: Date | null;
} | null) {
  if (!request || !request.isActive || (request.expiresAt && request.expiresAt < new Date())) return null;
  return `${publicBaseUrl()}${buildParentAvailabilityPath(request.token)}`;
}

function coordinationDto(ticket: any) {
  return {
    id: ticket.id,
    ticketNo: ticket.ticketNo,
    studentId: ticket.studentId,
    status: ticket.status,
    statusLabel: miniappRequestStatusLabel(ticket.status),
    owner: ticket.owner,
    nextAction: ticket.nextAction ?? "",
    nextActionDueDate: ticket.nextActionDue ? formatBusinessDateOnly(ticket.nextActionDue) : "",
    communicationHistory: ticket.risksNotes ?? "",
    availabilityUrl: activeAvailabilityUrl(ticket.parentAvailabilityRequest ?? null),
    updatedAtText: formatBusinessDateTime(ticket.updatedAt),
  };
}

function matchingTicket(tickets: any[], studentId: string, courseLabel: string) {
  const rows = tickets.filter((ticket) => ticket.studentId === studentId);
  return (
    rows.find((ticket) =>
      schedulingCoordinationCourseLabelsMatch(
        ticket.parentAvailabilityRequest?.courseLabel ?? ticket.course,
        courseLabel
      )
    ) ?? (!normalizeSchedulingCoordinationCourseKey(courseLabel) ? rows[0] ?? null : null)
  );
}

async function loadOpenTickets(studentIds: string[]) {
  if (studentIds.length === 0) return [];
  return prisma.ticket.findMany({
    where: {
      studentId: { in: studentIds },
      type: SCHEDULING_COORDINATION_TICKET_TYPE,
      isArchived: false,
      status: { notIn: ["Completed", "Cancelled"] },
    },
    include: { parentAvailabilityRequest: true },
    orderBy: [{ nextActionDue: "asc" }, { createdAt: "desc" }],
  });
}

async function requireCoordinationContext(req: Request, sessionId: string) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth;
  const session = await getMiniappStaffSessionContext(sessionId);
  if (!session || !canAccessMiniappStaffSession(auth.user, session)) {
    return { ok: false as const, response: bad("Session not found or no permission", 404) };
  }
  if (!canManageMiniappSchedulingCoordination(auth.user)) {
    return { ok: false as const, response: bad("Scheduling coordination permission required", 403) };
  }
  return { ok: true as const, auth, session };
}

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  const access = await requireCoordinationContext(req, sessionId);
  if (!access.ok) return access.response;

  const students = miniappStaffSessionStudents(access.session);
  const courseLabel = miniappStaffSessionCourseLabel(access.session);
  const tickets = await loadOpenTickets(students.map((student) => student.id));

  return ok({
    students: students.map((student) => {
      const ticket = matchingTicket(tickets, student.id, courseLabel);
      return {
        id: student.id,
        name: student.name,
        coordination: ticket ? coordinationDto(ticket) : null,
      };
    }),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  const access = await requireCoordinationContext(req, sessionId);
  if (!access.ok) return access.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");

  const students = miniappStaffSessionStudents(access.session);
  const studentId = cleanString((body as any).studentId, 80);
  const student = students.find((row) => row.id === studentId);
  if (!student) return bad("Student is not in this session", 409);

  const targetRaw = cleanString((body as any).communicationTarget, 30);
  const communicationTarget = COMMUNICATION_TARGETS.includes(targetRaw as any) ? targetRaw : "内部协调";
  const result = cleanString((body as any).communicationResult, 2000);
  if (!result) return bad("Communication result is required", 409);

  const statusRaw = cleanString((body as any).status, 40);
  const status = COORDINATION_STATUSES.includes(statusRaw as any) ? statusRaw : "Waiting Parent";
  const nextAction = cleanString((body as any).nextAction, 1000) || defaultNextAction(status);
  const nextActionDue = parseFollowUpDate((body as any).nextActionDue);
  if (!nextActionDue) return bad("Valid follow-up date is required", 409);

  const courseLabel = miniappStaffSessionCourseLabel(access.session);
  const teacherName = access.session.teacher?.name ?? access.session.class.teacher.name;
  const existingTickets = await loadOpenTickets([student.id]);
  const existing = matchingTicket(existingTickets, student.id, courseLabel);
  if (existing && !canTransitionTicketStatus(existing.status, status)) {
    return bad("Invalid coordination status transition", 409, { from: existing.status, to: status });
  }

  const now = new Date();
  const actorName = access.auth.user.name || access.auth.user.email;
  const communicationLog = `[${formatBusinessDateTime(now)}] ${actorName} · ${communicationTarget}\n${result}`;

  const saved = await prisma.$transaction(async (tx) => {
    let ticketId: string;
    if (existing) {
      const previousNotes = String(existing.risksNotes ?? "").trim();
      const updated = await tx.ticket.update({
        where: { id: existing.id },
        data: {
          status,
          owner: existing.owner || pickOwner(access.auth.user),
          nextAction,
          nextActionDue,
          lastUpdateAt: now,
          risksNotes: previousNotes ? `${previousNotes}\n\n${communicationLog}` : communicationLog,
        },
        select: { id: true },
      });
      ticketId = updated.id;
    } else {
      const ticketNo = await allocateTicketNo(tx);
      const initialIssue = schedulingCoordinationCurrentIssueText();
      const initialAction = nextAction || schedulingCoordinationInitialRequiredActionText();
      const created = await tx.ticket.create({
        data: {
          ticketNo,
          studentId: student.id,
          studentName: student.name,
          source: resolveTicketSource(student),
          type: SCHEDULING_COORDINATION_TICKET_TYPE,
          priority: "普通",
          grade: student.grade,
          course: courseLabel,
          teacher: teacherName,
          poc: actorName,
          status,
          owner: pickOwner(access.auth.user),
          version: "V1",
          systemUpdated: "N",
          summary: composeTicketSituation({
            currentIssue: initialIssue,
            requiredAction: initialAction,
            latestDeadlineText: formatBusinessDateTime(nextActionDue),
          }),
          nextAction: initialAction,
          nextActionDue,
          risksNotes: communicationLog,
          lastUpdateAt: now,
          createdByName: actorName,
        },
        select: { id: true },
      });
      ticketId = created.id;
    }

    const availability = await tx.parentAvailabilityRequest.findUnique({ where: { ticketId } });
    const needsFreshLink = !availability || !availability.isActive || (availability.expiresAt && availability.expiresAt < now);
    if (needsFreshLink) {
      await tx.parentAvailabilityRequest.upsert({
        where: { ticketId },
        update: {
          token: createParentAvailabilityToken(),
          courseLabel,
          isActive: true,
          expiresAt: buildParentAvailabilityExpiresAt(),
          submittedAt: null,
          payloadJson: Prisma.DbNull,
        },
        create: {
          ticketId,
          studentId: student.id,
          courseLabel,
          token: createParentAvailabilityToken(),
          expiresAt: buildParentAvailabilityExpiresAt(),
        },
      });
    }

    return tx.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: { parentAvailabilityRequest: true },
    });
  });

  await logAudit({
    actor: { email: access.auth.user.email, name: access.auth.user.name, role: access.auth.user.role },
    module: "TICKETS",
    action: existing ? "MINIAPP_COORDINATION_UPDATE" : "MINIAPP_COORDINATION_CREATE",
    entityType: "Ticket",
    entityId: saved.id,
    meta: { sessionId, studentId: student.id, communicationTarget, status },
  });

  return ok({
    message: existing ? "排课协调记录已更新。" : "排课协调工单已创建。",
    coordination: coordinationDto(saved),
  });
}
