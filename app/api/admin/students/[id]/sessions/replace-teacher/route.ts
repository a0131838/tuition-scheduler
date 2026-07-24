import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { pickTeacherSessionConflict } from "@/lib/session-conflict";
import { checkTeacherSchedulingAvailability } from "@/lib/teacher-scheduling-availability";
import { formatBusinessDateTime } from "@/lib/date-only";
import {
  applyAdminLinkedTicketSchedulingAction,
  TicketSchedulingActionContextError,
} from "@/lib/ticket-scheduling-action-write";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

async function checkTeacherAvailability(teacherId: string, startAt: Date, endAt: Date) {
  return checkTeacherSchedulingAvailability(prisma, teacherId, startAt, endAt);
}

function canTeachSubject(teacher: any, subjectId?: string | null) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  if (Array.isArray(teacher?.subjects)) {
    return teacher.subjects.some((s: any) => s?.id === subjectId);
  }
  return false;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id: studentId } = await params;
  if (!studentId) return bad("Missing studentId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const sessionId = String(body?.sessionId ?? "");
  const newTeacherId = String(body?.newTeacherId ?? "");
  const reason = String(body?.reason ?? "").trim() || null;
  const ticketId = String(body?.ticketId ?? "").trim();
  const ticketActionId = String(body?.ticketActionId ?? "").trim();

  if (!sessionId || !newTeacherId) return bad("Missing sessionId or newTeacherId");
  if (Boolean(ticketId) !== Boolean(ticketActionId)) return bad("Invalid ticket action context", 409);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { teacher: true, class: { include: { teacher: true } } },
  });
  if (!session || session.studentId !== studentId) return bad("Session not found", 404);

  const teacher = await prisma.teacher.findUnique({
    where: { id: newTeacherId },
    include: { subjects: true },
  });
  if (!teacher) return bad("Teacher not found", 404);
  if (!canTeachSubject(teacher, session.class.subjectId)) return bad("Teacher cannot teach this course", 409);
  const currentTeacherId = session.teacherId ?? session.class.teacherId;
  if (ticketId && currentTeacherId === newTeacherId) return bad("Please choose a different teacher", 409);

  const availErr = await checkTeacherAvailability(newTeacherId, session.startAt, session.endAt);
  if (availErr) return bad(availErr, 409);

  const teacherSessionConflicts = await prisma.session.findMany({
    where: {
      id: { not: session.id },
      startAt: { lt: session.endAt },
      endAt: { gt: session.startAt },
      OR: [{ teacherId: newTeacherId }, { teacherId: null, class: { teacherId: newTeacherId } }],
    },
    select: {
      id: true,
      classId: true,
      studentId: true,
      class: { select: { capacity: true, oneOnOneStudentId: true } },
      attendances: {
        select: {
          studentId: true,
          status: true,
          excusedCharge: true,
          deductedMinutes: true,
          deductedCount: true,
        },
      },
    },
  });
  const teacherSessionConflict = pickTeacherSessionConflict(teacherSessionConflicts, studentId);
  if (teacherSessionConflict) {
    return bad(`Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`, 409);
  }

  const teacherApptConflict = await prisma.appointment.findFirst({
    where: {
      teacherId: newTeacherId,
      startAt: { lt: session.endAt },
      endAt: { gt: session.startAt },
    },
    select: { id: true, startAt: true, endAt: true },
  });
  if (teacherApptConflict) return bad(`Teacher conflict with appointment ${teacherApptConflict.id}`, 409);

  try {
    await prisma.$transaction(async (tx) => {
      const fromTeacherId = currentTeacherId;
      const toTeacherId = newTeacherId;
      if (fromTeacherId !== toTeacherId) {
        await tx.session.update({
          where: { id: session.id },
          data: { teacherId: toTeacherId === session.class.teacherId ? null : toTeacherId },
        });

        await tx.sessionTeacherChange.create({
          data: {
            sessionId: session.id,
            fromTeacherId,
            toTeacherId,
            reason,
          },
        });
      }
      if (ticketId && ticketActionId) {
        const fromTeacherName = session.teacher?.name ?? session.class.teacher.name;
        await applyAdminLinkedTicketSchedulingAction(tx, {
          ticketId,
          actionId: ticketActionId,
          actionType: "REPLACE_TEACHER",
          sourceSessionId: sessionId,
          resultSessionId: sessionId,
          requestedTeacherId: newTeacherId,
          resultText: `已更换本节课老师：${formatBusinessDateTime(session.startAt)}；${fromTeacherName} → ${teacher.name}。`,
          appliedByUserId: user.id,
          actorEmail: user.email,
          actorName: user.name,
          actorRole: user.role,
          auditAction: "ADMIN_TICKET_TEACHER_REPLACEMENT_APPLIED",
        });
      }
    });
  } catch (error) {
    if (error instanceof TicketSchedulingActionContextError) {
      return bad(error.message, 409, { code: "TICKET_ACTION_CONTEXT" });
    }
    throw error;
  }

  return Response.json({ ok: true, ticketActionApplied: Boolean(ticketId && ticketActionId) });
}
