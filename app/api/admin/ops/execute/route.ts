import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStrictSuperAdmin, requireAdmin } from "@/lib/auth";
import { getOrCreateOneOnOneClassForStudent } from "@/lib/oneOnOne";
import { findStudentCourseEnrollment, formatEnrollmentConflict } from "@/lib/enrollment-conflict";
import { hasSchedulablePackage } from "@/lib/scheduling-package";
import { pickTeacherSessionConflict, shouldIgnoreTeacherConflictSession } from "@/lib/session-conflict";
import { campusRequiresRoom } from "@/lib/campus";

type OpMode = "preview" | "apply";
type TaskType =
  | "attendance.update_status"
  | "session.replace_teacher_single"
  | "package_txn.update_note_only"
  | "partner_settlement.mark_exported"
  | "ticket.append_followup_note"
  | "class_session.create_single"
  | "class_session.reschedule"
  | "student.quick_schedule";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function isObj(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function toInt(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function asJsonMeta(v: unknown) {
  return JSON.parse(JSON.stringify(v));
}

function parseMode(v: unknown): OpMode | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "preview" || s === "apply") return s;
  return null;
}

function parseTaskType(v: unknown): TaskType | null {
  const s = String(v ?? "").trim() as TaskType;
  if (
    s === "attendance.update_status" ||
    s === "session.replace_teacher_single" ||
    s === "package_txn.update_note_only" ||
    s === "partner_settlement.mark_exported" ||
    s === "ticket.append_followup_note" ||
    s === "class_session.create_single" ||
    s === "class_session.reschedule" ||
    s === "student.quick_schedule"
  ) {
    return s;
  }
  return null;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function fmtDateInput(d: Date | null) {
  if (!d) return "";
  return ymd(d);
}

function toMinFromDate(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function fmtSlotRange(startMin: number, endMin: number) {
  const sh = String(Math.floor(startMin / 60)).padStart(2, "0");
  const sm = String(startMin % 60).padStart(2, "0");
  const eh = String(Math.floor(endMin / 60)).padStart(2, "0");
  const em = String(endMin % 60).padStart(2, "0");
  return `${sh}:${sm}-${eh}:${em}`;
}

function parseDatetimeLocal(s: string) {
  const [date, time] = s.split("T");
  const [Y, M, D] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Y, M - 1, D, hh, mm, 0, 0);
}

function canTeachSubject(teacher: any, subjectId?: string | null) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  if (Array.isArray(teacher?.subjects)) {
    return teacher.subjects.some((s: any) => s?.id === subjectId);
  }
  return false;
}

async function checkTeacherAvailability(teacherId: string, startAt: Date, endAt: Date) {
  if (startAt.toDateString() !== endAt.toDateString()) {
    return "Session spans multiple days";
  }

  const startMin = toMinFromDate(startAt);
  const endMin = toMinFromDate(endAt);
  const dayStart = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 23, 59, 59, 999);

  let slots = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId, date: { gte: dayStart, lte: dayEnd } },
    select: { startMin: true, endMin: true },
    orderBy: { startMin: "asc" },
  });

  if (slots.length === 0) {
    const weekday = startAt.getDay();
    slots = await prisma.teacherAvailability.findMany({
      where: { teacherId, weekday },
      select: { startMin: true, endMin: true },
      orderBy: { startMin: "asc" },
    });

    if (slots.length === 0) {
      const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `No availability on ${WEEKDAYS[weekday] ?? weekday} (no slots)`;
    }
  }

  const ok = slots.some((s) => s.startMin <= startMin && s.endMin >= endMin);
  if (!ok) {
    const ranges = slots.map((s) => fmtSlotRange(s.startMin, s.endMin)).join(", ");
    const weekday = startAt.getDay();
    const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `Outside availability ${WEEKDAYS[weekday] ?? weekday} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}. Available: ${ranges}`;
  }

  return null;
}

async function previewAttendanceStatus(payload: Record<string, unknown>) {
  const sessionId = String(payload.sessionId ?? "").trim();
  const studentId = String(payload.studentId ?? "").trim();
  const toStatus = String(payload.toStatus ?? "").trim();
  const fromStatus = String(payload.fromStatus ?? "").trim();
  if (!sessionId || !studentId || !toStatus) return { error: "Missing sessionId/studentId/toStatus", status: 409 };
  if (!Object.values(AttendanceStatus).includes(toStatus as AttendanceStatus)) {
    return { error: "Invalid toStatus", status: 409 };
  }
  if (fromStatus && !Object.values(AttendanceStatus).includes(fromStatus as AttendanceStatus)) {
    return { error: "Invalid fromStatus", status: 409 };
  }

  const row = await prisma.attendance.findUnique({
    where: { sessionId_studentId: { sessionId, studentId } },
    include: {
      session: {
        include: {
          teacher: { select: { id: true, name: true } },
          class: {
            include: {
              teacher: { select: { id: true, name: true } },
              course: { select: { name: true } },
              subject: { select: { name: true } },
              level: { select: { name: true } },
            },
          },
        },
      },
      student: { select: { id: true, name: true } },
    },
  });
  if (!row) return { error: "Attendance not found", status: 404 };
  if (fromStatus && row.status !== fromStatus) {
    return { error: `fromStatus mismatch (current=${row.status})`, status: 409 };
  }

  return {
    affectedCount: 1,
    sampleIds: [`${row.sessionId}:${row.studentId}`],
    changesetPreview: [
      {
        id: `${row.sessionId}:${row.studentId}`,
        before: { status: row.status },
        after: { status: toStatus },
      },
    ],
    details: {
      student: row.student.name,
      class: row.session.class.course.name,
      subject: row.session.class.subject?.name ?? null,
      level: row.session.class.level?.name ?? null,
      startAt: row.session.startAt.toISOString(),
      endAt: row.session.endAt.toISOString(),
      teacher: row.session.teacher?.name ?? row.session.class.teacher.name,
    },
  };
}

async function previewSessionReplaceTeacher(payload: Record<string, unknown>) {
  const sessionId = String(payload.sessionId ?? "").trim();
  const newTeacherId = String(payload.newTeacherId ?? "").trim();
  if (!sessionId || !newTeacherId) return { error: "Missing sessionId/newTeacherId", status: 409 };

  const row = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      teacher: { select: { id: true, name: true } },
      class: {
        include: {
          teacher: { select: { id: true, name: true } },
          course: { select: { name: true } },
          subject: { select: { name: true } },
          level: { select: { name: true } },
        },
      },
    },
  });
  if (!row) return { error: "Session not found", status: 404 };
  const newTeacher = await prisma.teacher.findUnique({ where: { id: newTeacherId }, select: { id: true, name: true } });
  if (!newTeacher) return { error: "New teacher not found", status: 404 };

  const currentTeacherId = row.teacherId ?? row.class.teacherId;
  const currentTeacherName = row.teacher?.name ?? row.class.teacher.name;
  return {
    affectedCount: 1,
    sampleIds: [row.id],
    changesetPreview: [
      {
        id: row.id,
        before: { teacherId: currentTeacherId, teacherName: currentTeacherName },
        after: { teacherId: newTeacher.id, teacherName: newTeacher.name },
      },
    ],
    details: {
      class: row.class.course.name,
      subject: row.class.subject?.name ?? null,
      level: row.class.level?.name ?? null,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
    },
  };
}

async function previewPackageTxnNote(payload: Record<string, unknown>) {
  const packageId = String(payload.packageId ?? "").trim();
  const newNote = String(payload.newNote ?? "");
  const txnIds = Array.isArray(payload.txnIds) ? payload.txnIds.map((v) => String(v ?? "").trim()).filter(Boolean) : [];
  if (!packageId || txnIds.length === 0) return { error: "Missing packageId/txnIds", status: 409 };

  const rows = await prisma.packageTxn.findMany({
    where: { packageId, id: { in: txnIds } },
    orderBy: { createdAt: "desc" },
    select: { id: true, kind: true, note: true, deltaMinutes: true, createdAt: true },
  });
  if (rows.length === 0) return { error: "No package transactions found", status: 404 };

  return {
    affectedCount: rows.length,
    sampleIds: rows.slice(0, 20).map((r) => r.id),
    changesetPreview: rows.slice(0, 20).map((r) => ({
      id: r.id,
      before: { note: r.note ?? "" },
      after: { note: newNote },
    })),
    details: rows.slice(0, 20).map((r) => ({
      id: r.id,
      kind: r.kind,
      deltaMinutes: r.deltaMinutes,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

async function previewPartnerSettlementExport(payload: Record<string, unknown>) {
  const settlementId = String(payload.settlementId ?? "").trim();
  if (!settlementId) return { error: "Missing settlementId", status: 409 };

  const row = await prisma.partnerSettlement.findUnique({
    where: { id: settlementId },
    include: {
      student: { select: { id: true, name: true } },
      package: { include: { course: { select: { name: true } } } },
    },
  });
  if (!row) return { error: "Partner settlement not found", status: 404 };

  return {
    affectedCount: 1,
    sampleIds: [row.id],
    changesetPreview: [
      {
        id: row.id,
        before: { status: row.status },
        after: { status: "INVOICED" },
      },
    ],
    details: {
      student: row.student.name,
      course: row.package?.course?.name ?? null,
      monthKey: row.monthKey ?? null,
      amount: row.amount,
      hours: String(row.hours),
    },
  };
}

async function previewTicketAppendNote(payload: Record<string, unknown>) {
  const ticketId = String(payload.ticketId ?? "").trim();
  const appendText = String(payload.appendText ?? "").trim();
  if (!ticketId || !appendText) return { error: "Missing ticketId/appendText", status: 409 };

  const row = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, ticketNo: true, summary: true, status: true, owner: true, updatedAt: true },
  });
  if (!row) return { error: "Ticket not found", status: 404 };

  const merged = `${row.summary ?? ""}${row.summary ? "\n" : ""}[FOLLOW-UP] ${appendText}`;
  return {
    affectedCount: 1,
    sampleIds: [row.id],
    changesetPreview: [
      {
        id: row.id,
        before: { summary: row.summary ?? "" },
        after: { summary: merged },
      },
    ],
    details: {
      ticketNo: row.ticketNo,
      status: row.status,
      owner: row.owner ?? null,
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}

async function findConflictForClassSession(opts: {
  classId: string;
  teacherId: string;
  roomId: string | null;
  startAt: Date;
  endAt: Date;
  schedulingStudentId?: string | null;
}) {
  const { classId, teacherId, roomId, startAt, endAt, schedulingStudentId } = opts;
  const availErr = await checkTeacherAvailability(teacherId, startAt, endAt);
  if (availErr) return availErr;

  const dup = await prisma.session.findFirst({
    where: { classId, startAt, endAt },
    select: { id: true },
  });
  if (dup) return `Session already exists at ${ymd(startAt)} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}`;

  const teacherSessionConflicts = await prisma.session.findMany({
    where: {
      OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
      startAt: { lt: endAt },
      endAt: { gt: startAt },
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
  const teacherSessionConflict = pickTeacherSessionConflict(teacherSessionConflicts, schedulingStudentId);
  if (teacherSessionConflict) {
    return `Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`;
  }

  const teacherApptConflict = await prisma.appointment.findFirst({
    where: {
      teacherId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, startAt: true, endAt: true },
  });
  if (teacherApptConflict) {
    return `Teacher conflict with appointment ${ymd(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(
      teacherApptConflict.endAt
    )}`;
  }

  if (roomId) {
    const roomSessionConflicts = await prisma.session.findMany({
      where: {
        class: { roomId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: {
        id: true,
        classId: true,
        studentId: true,
        class: { select: { capacity: true, oneOnOneStudentId: true, enrollments: { select: { studentId: true } } } },
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
    const roomSessionConflict = pickTeacherSessionConflict(roomSessionConflicts);
    if (roomSessionConflict) {
      return `Room conflict with session ${roomSessionConflict.id} (class ${roomSessionConflict.classId})`;
    }
  }

  return null;
}

async function previewClassSessionCreate(payload: Record<string, unknown>) {
  const classId = String(payload.classId ?? "").trim();
  const startAtStr = String(payload.startAt ?? "").trim();
  const durationMin = Number(payload.durationMin ?? 60);
  const studentId = String(payload.studentId ?? "").trim();
  if (!classId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
    return { error: "Missing classId/startAt/durationMin", status: 409 };
  }

  const startAt = new Date(startAtStr);
  if (Number.isNaN(startAt.getTime())) return { error: "Invalid startAt", status: 409 };
  const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { teacher: true, room: true, campus: true, course: true, subject: true, level: true, enrollments: { select: { studentId: true } } },
  });
  if (!cls) return { error: "Class not found", status: 404 };

  if (cls.capacity === 1) {
    if (!studentId) return { error: "Please select a student", status: 409 };
    const enrolled = await prisma.enrollment.findFirst({ where: { classId, studentId }, select: { id: true } });
    if (!enrolled) return { error: "Student not enrolled in this class", status: 409 };
  }

  const expectedStudentIds =
    cls.capacity === 1 ? [studentId] : Array.from(new Set(cls.enrollments.map((e) => e.studentId).filter(Boolean)));
  const requiredHoursMinutes = cls.capacity === 1 ? durationMin : 1;
  for (const sid of expectedStudentIds) {
    const ok = await hasSchedulablePackage(prisma, {
      studentId: sid,
      courseId: cls.courseId,
      at: startAt,
      requiredHoursMinutes,
    });
    if (!ok) return { error: `Student ${sid} has no active package for this course`, status: 409 };
  }

  const conflict = await findConflictForClassSession({
    classId,
    teacherId: cls.teacherId,
    roomId: cls.roomId ?? null,
    startAt,
    endAt,
    schedulingStudentId: cls.capacity === 1 ? studentId : null,
  });
  if (conflict) return { error: conflict, status: 409 };

  return {
    affectedCount: 1,
    sampleIds: [classId],
    changesetPreview: [
      {
        id: classId,
        before: null,
        after: { startAt: startAt.toISOString(), endAt: endAt.toISOString(), studentId: cls.capacity === 1 ? studentId : null },
      },
    ],
    details: {
      classId,
      course: cls.course.name,
      subject: cls.subject?.name ?? null,
      level: cls.level?.name ?? null,
      teacher: cls.teacher.name,
      campus: cls.campus?.name ?? null,
      room: cls.room?.name ?? null,
    },
  };
}

async function applyClassSessionCreate(payload: Record<string, unknown>, maxAffected: number) {
  const preview = await previewClassSessionCreate(payload);
  if ("error" in preview) return preview;
  if (preview.affectedCount > maxAffected) {
    return { error: `affectedCount ${preview.affectedCount} exceeds maxAffected ${maxAffected}`, status: 409 as const };
  }

  const classId = String(payload.classId ?? "").trim();
  const startAt = new Date(String(payload.startAt ?? "").trim());
  const durationMin = Number(payload.durationMin ?? 60);
  const studentId = String(payload.studentId ?? "").trim();
  const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);
  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { capacity: true, teacherId: true } });
  if (!cls) return { error: "Class not found", status: 404 as const };

  const created = await prisma.session.create({
    data: { classId, startAt, endAt, studentId: cls.capacity === 1 ? studentId : null },
  });

  const post = await prisma.session.findUnique({
    where: { id: created.id },
    select: { id: true, classId: true, startAt: true, endAt: true, studentId: true },
  });

  return {
    affectedCount: 1,
    sampleIds: [created.id],
    changesetAfter: [
      {
        id: created.id,
        before: null,
        after: {
          classId: post?.classId ?? classId,
          startAt: post?.startAt.toISOString() ?? startAt.toISOString(),
          endAt: post?.endAt.toISOString() ?? endAt.toISOString(),
          studentId: post?.studentId ?? null,
        },
      },
    ],
  };
}

async function previewClassSessionReschedule(payload: Record<string, unknown>) {
  const classId = String(payload.classId ?? "").trim();
  const sessionId = String(payload.sessionId ?? "").trim();
  const startAtStr = String(payload.startAt ?? "").trim();
  const durationMin = Number(payload.durationMin ?? 60);
  const scope = String(payload.scope ?? "single");
  if (!classId || !sessionId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
    return { error: "Missing classId/sessionId/startAt/durationMin", status: 409 };
  }
  if (scope !== "single" && scope !== "future") return { error: "Invalid scope", status: 409 };

  const newAnchorStart = new Date(startAtStr);
  if (Number.isNaN(newAnchorStart.getTime())) return { error: "Invalid startAt", status: 409 };

  const anchor = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      class: { select: { id: true, capacity: true, teacherId: true, roomId: true, courseId: true, enrollments: { select: { studentId: true } } } },
    },
  });
  if (!anchor || anchor.classId !== classId) return { error: "Session not found", status: 404 };

  const targetSessions =
    scope === "future"
      ? await prisma.session.findMany({
          where: { classId, startAt: { gte: anchor.startAt } },
          include: { class: { select: { teacherId: true, roomId: true, capacity: true, courseId: true, enrollments: { select: { studentId: true } } } } },
          orderBy: { startAt: "asc" },
        })
      : [anchor];
  const targetIds = targetSessions.map((s) => s.id);
  const deltaMs = newAnchorStart.getTime() - anchor.startAt.getTime();

  const marked = await prisma.attendance.findFirst({
    where: { sessionId: { in: targetIds }, status: { not: "UNMARKED" } },
    include: { session: { select: { startAt: true, endAt: true } } },
    orderBy: { session: { startAt: "asc" } },
  });
  if (marked?.session) {
    return {
      error: `Cannot reschedule marked session ${ymd(marked.session.startAt)} ${fmtHHMM(marked.session.startAt)}-${fmtHHMM(marked.session.endAt)}`,
      status: 409,
    };
  }

  const planned = targetSessions.map((s) => {
    const startAt = scope === "future" ? new Date(s.startAt.getTime() + deltaMs) : newAnchorStart;
    const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);
    return { session: s, startAt, endAt };
  });

  for (const item of planned) {
    const s = item.session;
    const effectiveTeacherId = s.teacherId ?? s.class.teacherId;
    const roomId = s.class.roomId ?? null;
    const schedulingStudentId = s.studentId ?? null;

    const availErr = await checkTeacherAvailability(effectiveTeacherId, item.startAt, item.endAt);
    if (availErr) {
      return { error: `Availability conflict on ${ymd(item.startAt)} ${fmtHHMM(item.startAt)}-${fmtHHMM(item.endAt)}: ${availErr}`, status: 409 };
    }

    const dup = await prisma.session.findFirst({
      where: { id: { notIn: targetIds }, classId, startAt: item.startAt, endAt: item.endAt },
      select: { id: true },
    });
    if (dup) return { error: `Session already exists at ${ymd(item.startAt)} ${fmtHHMM(item.startAt)}-${fmtHHMM(item.endAt)}`, status: 409 };

    const teacherSessionConflicts = await prisma.session.findMany({
      where: {
        id: { notIn: targetIds },
        OR: [{ teacherId: effectiveTeacherId }, { teacherId: null, class: { teacherId: effectiveTeacherId } }],
        startAt: { lt: item.endAt },
        endAt: { gt: item.startAt },
      },
      select: {
        id: true,
        classId: true,
        studentId: true,
        class: { select: { capacity: true, oneOnOneStudentId: true } },
        attendances: { select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true } },
      },
    });
    const teacherSessionConflict = pickTeacherSessionConflict(teacherSessionConflicts, schedulingStudentId);
    if (teacherSessionConflict) {
      return { error: `Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`, status: 409 };
    }

    const teacherApptConflict = await prisma.appointment.findFirst({
      where: { teacherId: effectiveTeacherId, startAt: { lt: item.endAt }, endAt: { gt: item.startAt } },
      select: { startAt: true, endAt: true },
    });
    if (teacherApptConflict) {
      return {
        error: `Teacher conflict with appointment ${ymd(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(
          teacherApptConflict.endAt
        )}`,
        status: 409,
      };
    }

    if (roomId) {
      const roomSessionConflicts = await prisma.session.findMany({
        where: { id: { notIn: targetIds }, class: { roomId }, startAt: { lt: item.endAt }, endAt: { gt: item.startAt } },
        select: {
          id: true,
          classId: true,
          studentId: true,
          class: { select: { capacity: true, oneOnOneStudentId: true, enrollments: { select: { studentId: true } } } },
          attendances: { select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true } },
        },
      });
      const roomSessionConflict = pickTeacherSessionConflict(roomSessionConflicts);
      if (roomSessionConflict) {
        return { error: `Room conflict with session ${roomSessionConflict.id} (class ${roomSessionConflict.classId})`, status: 409 };
      }
    }

    const expectedStudentIds =
      s.class.capacity === 1 ? (s.studentId ? [s.studentId] : []) : Array.from(new Set(s.class.enrollments.map((e) => e.studentId).filter(Boolean)));
    const requiredHoursMinutes = s.class.capacity === 1 ? durationMin : 1;
    for (const sid of expectedStudentIds) {
      const ok = await hasSchedulablePackage(prisma, { studentId: sid, courseId: s.class.courseId, at: item.startAt, requiredHoursMinutes });
      if (!ok) return { error: `Student ${sid} has no active package for this course`, status: 409 };
    }
  }

  return {
    affectedCount: planned.length,
    sampleIds: planned.slice(0, 20).map((item) => item.session.id),
    changesetPreview: planned.slice(0, 20).map((item) => ({
      id: item.session.id,
      before: { startAt: item.session.startAt.toISOString(), endAt: item.session.endAt.toISOString() },
      after: { startAt: item.startAt.toISOString(), endAt: item.endAt.toISOString() },
    })),
    details: {
      scope,
      classId,
      targetCount: planned.length,
    },
  };
}

async function applyClassSessionReschedule(payload: Record<string, unknown>, maxAffected: number) {
  const preview = await previewClassSessionReschedule(payload);
  if ("error" in preview) return preview;
  if (preview.affectedCount > maxAffected) {
    return { error: `affectedCount ${preview.affectedCount} exceeds maxAffected ${maxAffected}`, status: 409 as const };
  }

  const classId = String(payload.classId ?? "").trim();
  const sessionId = String(payload.sessionId ?? "").trim();
  const startAtStr = String(payload.startAt ?? "").trim();
  const durationMin = Number(payload.durationMin ?? 60);
  const scope = String(payload.scope ?? "single");
  const newAnchorStart = new Date(startAtStr);
  const anchor = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true, classId: true, startAt: true, endAt: true } });
  if (!anchor || anchor.classId !== classId) return { error: "Session not found", status: 404 as const };

  const targetSessions =
    scope === "future"
      ? await prisma.session.findMany({ where: { classId, startAt: { gte: anchor.startAt } }, orderBy: { startAt: "asc" }, select: { id: true, startAt: true, endAt: true } })
      : [anchor];
  const deltaMs = newAnchorStart.getTime() - anchor.startAt.getTime();
  const planned = targetSessions.map((s) => {
    const startAt = scope === "future" ? new Date(s.startAt.getTime() + deltaMs) : newAnchorStart;
    const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);
    return { session: s, startAt, endAt };
  });

  await prisma.$transaction(
    planned.map((item) => prisma.session.update({ where: { id: item.session.id }, data: { startAt: item.startAt, endAt: item.endAt } }))
  );

  const postRows = await prisma.session.findMany({
    where: { id: { in: planned.map((item) => item.session.id) } },
    select: { id: true, startAt: true, endAt: true },
  });
  const postMap = new Map(postRows.map((row) => [row.id, row]));

  return {
    affectedCount: planned.length,
    sampleIds: planned.slice(0, 20).map((item) => item.session.id),
    changesetAfter: planned.slice(0, 20).map((item) => {
      const post = postMap.get(item.session.id);
      return {
        id: item.session.id,
        before: { startAt: item.session.startAt.toISOString(), endAt: item.session.endAt.toISOString() },
        after: { startAt: post?.startAt.toISOString() ?? item.startAt.toISOString(), endAt: post?.endAt.toISOString() ?? item.endAt.toISOString() },
      };
    }),
  };
}

async function previewStudentQuickSchedule(payload: Record<string, unknown>, bypassAvailabilityCheck: boolean) {
  const studentId = String(payload.studentId ?? "").trim();
  const teacherId = String(payload.teacherId ?? "").trim();
  const subjectId = String(payload.subjectId ?? "").trim();
  const levelIdRaw = String(payload.levelId ?? "").trim();
  const campusId = String(payload.campusId ?? "").trim();
  const roomIdRaw = String(payload.roomId ?? "").trim();
  const startAtStr = String(payload.startAt ?? "").trim();
  const durationMin = Number(payload.durationMin ?? 60);
  const repeatWeeksRaw = Number(payload.repeatWeeks ?? 1);
  const repeatWeeks = Number.isFinite(repeatWeeksRaw) ? Math.max(1, Math.min(16, Math.floor(repeatWeeksRaw))) : 1;
  const onConflict = String(payload.onConflict ?? "reject");
  if (!studentId || !teacherId || !subjectId || !campusId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
    return { error: "Missing studentId/teacherId/subjectId/campusId/startAt/durationMin", status: 409 };
  }
  if (onConflict !== "reject" && onConflict !== "skip") return { error: "Invalid onConflict", status: 409 };

  const roomId = roomIdRaw || null;
  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  if (!campus) return { error: "Campus not found", status: 404 };
  if (!roomId && campusRequiresRoom(campus)) return { error: "Room is required", status: 409 };
  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.campusId !== campusId) return { error: "Invalid room", status: 409 };
  }

  const startAt = parseDatetimeLocal(startAtStr);
  if (Number.isNaN(startAt.getTime())) return { error: "Invalid startAt", status: 409 };

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, include: { subjects: true } });
  if (!teacher) return { error: "Teacher not found", status: 404 };
  if (!canTeachSubject(teacher, subjectId)) return { error: "Teacher cannot teach this course", status: 409 };

  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, courseId: true, name: true } });
  if (!subject) return { error: "Invalid subject", status: 409 };

  let levelId: string | null = null;
  if (levelIdRaw) {
    const level = await prisma.level.findUnique({ where: { id: levelIdRaw } });
    if (!level || level.subjectId !== subjectId) return { error: "Invalid subject or level", status: 409 };
    levelId = levelIdRaw;
  }

  const courseId = subject.courseId;
  let cls: Awaited<ReturnType<typeof getOrCreateOneOnOneClassForStudent>>;
  try {
    cls = await getOrCreateOneOnOneClassForStudent({
      teacherId,
      studentId,
      courseId,
      subjectId,
      levelId,
      campusId,
      roomId,
      ensureEnrollment: true,
      preferTeacherClass: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "COURSE_ENROLLMENT_CONFLICT") {
      const conflict = await findStudentCourseEnrollment(studentId, courseId, undefined, subjectId);
      return {
        error: "Course enrollment conflict",
        status: 409,
        details: conflict ? formatEnrollmentConflict(conflict) : undefined,
      };
    }
    return { error: msg || "Quick schedule failed", status: 500 };
  }
  if (!cls) return { error: "Failed to create class", status: 500 };

  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const rows: Array<{ index: number; startAt: string; endAt: string; ok: boolean; reason?: string }> = [];
  let okCount = 0;
  for (let i = 0; i < repeatWeeks; i++) {
    const currentStart = new Date(startAt.getTime() + i * oneWeekMs);
    const currentEnd = new Date(currentStart.getTime() + durationMin * 60 * 1000);
    let reason = "";

    if (!bypassAvailabilityCheck) {
      const availErr = await checkTeacherAvailability(teacherId, currentStart, currentEnd);
      if (availErr) reason = availErr;
    }

    if (!reason) {
      const teacherSessionConflicts = await prisma.session.findMany({
        where: { OR: [{ teacherId }, { teacherId: null, class: { teacherId } }], startAt: { lt: currentEnd }, endAt: { gt: currentStart } },
        include: {
          class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
          attendances: { select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true } },
        },
        orderBy: { startAt: "asc" },
      });
      const teacherSessionConflict = teacherSessionConflicts.find((s) => !shouldIgnoreTeacherConflictSession(s, studentId));
      if (teacherSessionConflict) {
        const cls2 = teacherSessionConflict.class;
        const classLabel = `${cls2.course.name}${cls2.subject ? ` / ${cls2.subject.name}` : ""}${cls2.level ? ` / ${cls2.level.name}` : ""}`;
        const roomLabel = cls2.room?.name ?? "(none)";
        const timeLabel = `${fmtDateInput(teacherSessionConflict.startAt)} ${fmtHHMM(teacherSessionConflict.startAt)}-${fmtHHMM(teacherSessionConflict.endAt)}`;
        reason = `Teacher conflict: ${classLabel} | ${cls2.teacher.name} | ${cls2.campus.name} / ${roomLabel} | ${timeLabel}`;
      }
    }

    if (!reason) {
      const teacherApptConflict = await prisma.appointment.findFirst({
        where: { teacherId, startAt: { lt: currentEnd }, endAt: { gt: currentStart } },
        select: { startAt: true, endAt: true },
      });
      if (teacherApptConflict) {
        reason = `Teacher conflict: appointment ${fmtDateInput(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(
          teacherApptConflict.endAt
        )}`;
      }
    }

    if (!reason && roomId) {
      const roomConflicts = await prisma.session.findMany({
        where: { class: { roomId }, startAt: { lt: currentEnd }, endAt: { gt: currentStart } },
        include: {
          attendances: { select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true } },
          class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true, enrollments: { select: { studentId: true } } } },
        },
      });
      const roomConflict = pickTeacherSessionConflict(roomConflicts);
      if (roomConflict) {
        const cls2 = roomConflict.class;
        const classLabel = `${cls2.course.name}${cls2.subject ? ` / ${cls2.subject.name}` : ""}${cls2.level ? ` / ${cls2.level.name}` : ""}`;
        const roomLabel = cls2.room?.name ?? "(none)";
        const timeLabel = `${fmtDateInput(roomConflict.startAt)} ${fmtHHMM(roomConflict.startAt)}-${fmtHHMM(roomConflict.endAt)}`;
        reason = `Room conflict: ${classLabel} | ${cls2.teacher.name} | ${cls2.campus.name} / ${roomLabel} | ${timeLabel}`;
      }
    }

    if (!reason) {
      const packageCheckAt = currentStart.getTime() < Date.now() ? new Date() : currentStart;
      const hasPackage = await hasSchedulablePackage(prisma, { studentId, courseId, at: packageCheckAt, requiredHoursMinutes: durationMin });
      if (!hasPackage) reason = "No active package for this course";
    }

    if (!reason) {
      const dupSession = await prisma.session.findFirst({
        where: { classId: cls.id, startAt: currentStart, endAt: currentEnd },
        select: { id: true },
      });
      if (dupSession) reason = "Session already exists at this time";
    }

    if (reason) {
      rows.push({ index: i + 1, startAt: currentStart.toISOString(), endAt: currentEnd.toISOString(), ok: false, reason });
      if (onConflict === "reject") return { error: reason, status: 409 };
      continue;
    }

    okCount++;
    rows.push({ index: i + 1, startAt: currentStart.toISOString(), endAt: currentEnd.toISOString(), ok: true });
  }

  return {
    affectedCount: okCount,
    sampleIds: rows.filter((row) => row.ok).slice(0, 20).map((row) => `${cls.id}:${row.index}`),
    changesetPreview: rows.slice(0, 20).map((row) => ({
      id: `${cls.id}:${row.index}`,
      before: null,
      after: { startAt: row.startAt, endAt: row.endAt, ok: row.ok, reason: row.reason ?? null },
    })),
    details: { classId: cls.id, created: okCount, skipped: rows.length - okCount, total: rows.length, rows },
  };
}

async function applyStudentQuickSchedule(payload: Record<string, unknown>, maxAffected: number, bypassAvailabilityCheck: boolean) {
  const preview = await previewStudentQuickSchedule(payload, bypassAvailabilityCheck);
  if ("error" in preview) return preview;
  if (preview.affectedCount > maxAffected) {
    return { error: `affectedCount ${preview.affectedCount} exceeds maxAffected ${maxAffected}`, status: 409 as const };
  }

  const studentId = String(payload.studentId ?? "").trim();
  const teacherId = String(payload.teacherId ?? "").trim();
  const subjectId = String(payload.subjectId ?? "").trim();
  const levelIdRaw = String(payload.levelId ?? "").trim();
  const campusId = String(payload.campusId ?? "").trim();
  const roomIdRaw = String(payload.roomId ?? "").trim();
  const startAtStr = String(payload.startAt ?? "").trim();
  const durationMin = Number(payload.durationMin ?? 60);
  const repeatWeeksRaw = Number(payload.repeatWeeks ?? 1);
  const repeatWeeks = Number.isFinite(repeatWeeksRaw) ? Math.max(1, Math.min(16, Math.floor(repeatWeeksRaw))) : 1;
  const onConflict = String(payload.onConflict ?? "reject");
  const roomId = roomIdRaw || null;
  const startAt = parseDatetimeLocal(startAtStr);
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { courseId: true } });
  if (!subject) return { error: "Invalid subject", status: 409 as const };
  let levelId: string | null = null;
  if (levelIdRaw) levelId = levelIdRaw;
  const cls = await getOrCreateOneOnOneClassForStudent({
    teacherId,
    studentId,
    courseId: subject.courseId,
    subjectId,
    levelId,
    campusId,
    roomId,
    ensureEnrollment: true,
    preferTeacherClass: true,
  });
  if (!cls) return { error: "Failed to create class", status: 500 as const };

  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const createdRows: Array<{ id: string; startAt: string; endAt: string }> = [];
  for (let i = 0; i < repeatWeeks; i++) {
    const currentStart = new Date(startAt.getTime() + i * oneWeekMs);
    const currentEnd = new Date(currentStart.getTime() + durationMin * 60 * 1000);
    let reason = "";

    if (!bypassAvailabilityCheck) {
      const availErr = await checkTeacherAvailability(teacherId, currentStart, currentEnd);
      if (availErr) reason = availErr;
    }

    if (!reason) {
      const teacherSessionConflicts = await prisma.session.findMany({
        where: { OR: [{ teacherId }, { teacherId: null, class: { teacherId } }], startAt: { lt: currentEnd }, endAt: { gt: currentStart } },
        include: {
          class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
          attendances: { select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true } },
        },
        orderBy: { startAt: "asc" },
      });
      const teacherSessionConflict = teacherSessionConflicts.find((s) => !shouldIgnoreTeacherConflictSession(s, studentId));
      if (teacherSessionConflict) reason = "Teacher conflict";
    }

    if (!reason) {
      const teacherApptConflict = await prisma.appointment.findFirst({
        where: { teacherId, startAt: { lt: currentEnd }, endAt: { gt: currentStart } },
        select: { id: true },
      });
      if (teacherApptConflict) reason = "Teacher conflict";
    }

    if (!reason && roomId) {
      const roomConflicts = await prisma.session.findMany({
        where: { class: { roomId }, startAt: { lt: currentEnd }, endAt: { gt: currentStart } },
        include: {
          attendances: { select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true } },
          class: { include: { enrollments: { select: { studentId: true } } } },
        },
      });
      const roomConflict = pickTeacherSessionConflict(roomConflicts);
      if (roomConflict) reason = "Room conflict";
    }

    if (!reason) {
      const packageCheckAt = currentStart.getTime() < Date.now() ? new Date() : currentStart;
      const hasPackage = await hasSchedulablePackage(prisma, {
        studentId,
        courseId: subject.courseId,
        at: packageCheckAt,
        requiredHoursMinutes: durationMin,
      });
      if (!hasPackage) reason = "No active package for this course";
    }

    if (!reason) {
      const dupSession = await prisma.session.findFirst({ where: { classId: cls.id, startAt: currentStart, endAt: currentEnd }, select: { id: true } });
      if (dupSession) reason = "Session already exists at this time";
    }

    if (reason) {
      if (onConflict === "reject") return { error: reason, status: 409 as const };
      continue;
    }

    const created = await prisma.session.create({
      data: { classId: cls.id, startAt: currentStart, endAt: currentEnd, studentId, teacherId: teacherId === cls.teacherId ? null : teacherId },
      select: { id: true, startAt: true, endAt: true },
    });
    createdRows.push({ id: created.id, startAt: created.startAt.toISOString(), endAt: created.endAt.toISOString() });
  }

  return {
    affectedCount: createdRows.length,
    sampleIds: createdRows.slice(0, 20).map((row) => row.id),
    changesetAfter: createdRows.slice(0, 20).map((row) => ({
      id: row.id,
      before: null,
      after: { startAt: row.startAt, endAt: row.endAt, classId: cls.id },
    })),
  };
}

async function applyPackageTxnNote(payload: Record<string, unknown>, maxAffected: number) {
  const packageId = String(payload.packageId ?? "").trim();
  const newNote = String(payload.newNote ?? "");
  const txnIds = Array.isArray(payload.txnIds) ? payload.txnIds.map((v) => String(v ?? "").trim()).filter(Boolean) : [];
  if (!packageId || txnIds.length === 0) return { error: "Missing packageId/txnIds", status: 409 as const };

  const rows = await prisma.packageTxn.findMany({
    where: { packageId, id: { in: txnIds } },
    select: { id: true, note: true },
  });
  if (rows.length === 0) return { error: "No package transactions found", status: 404 as const };
  if (rows.length > maxAffected) {
    return { error: `affectedCount ${rows.length} exceeds maxAffected ${maxAffected}`, status: 409 as const };
  }

  const updated = await prisma.packageTxn.updateMany({
    where: { packageId, id: { in: rows.map((r) => r.id) } },
    data: { note: newNote },
  });

  return {
    affectedCount: updated.count,
    sampleIds: rows.slice(0, 20).map((r) => r.id),
    changesetAfter: rows.slice(0, 20).map((r) => ({
      id: r.id,
      before: { note: r.note ?? "" },
      after: { note: newNote },
    })),
  };
}

async function applyTicketAppendNote(payload: Record<string, unknown>, maxAffected: number) {
  const ticketId = String(payload.ticketId ?? "").trim();
  const appendText = String(payload.appendText ?? "").trim();
  if (!ticketId || !appendText) return { error: "Missing ticketId/appendText", status: 409 as const };
  if (maxAffected < 1) return { error: "maxAffected must be >= 1", status: 409 as const };

  const row = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, summary: true, updatedAt: true },
  });
  if (!row) return { error: "Ticket not found", status: 404 as const };

  const merged = `${row.summary ?? ""}${row.summary ? "\n" : ""}[FOLLOW-UP] ${appendText}`;
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { summary: merged },
  });

  return {
    affectedCount: 1,
    sampleIds: [ticketId],
    changesetAfter: [
      {
        id: ticketId,
        before: { summary: row.summary ?? "" },
        after: { summary: merged },
      },
    ],
  };
}

export async function POST(req: Request) {
  const actor = await requireAdmin();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }
  if (!isObj(body)) return bad("Invalid payload");

  const operationId = String(body.operationId ?? "").trim();
  const mode = parseMode(body.mode);
  const taskType = parseTaskType(body.taskType);
  const payload = isObj(body.payload) ? body.payload : null;
  const safety = isObj(body.safety) ? body.safety : null;
  const maxAffected = toInt(safety?.maxAffected, 0);
  const forceApply = Boolean(safety?.forceApply);
  const confirmPhrase = String(safety?.confirmPhrase ?? "").trim();
  const confirmationText = String(body.confirmationText ?? "").trim();

  if (!operationId) return bad("Missing operationId", 409);
  if (!mode) return bad("Invalid mode", 409);
  if (!taskType) return bad("Unsupported taskType", 409);
  if (!payload) return bad("Missing payload", 409);
  if (!safety || maxAffected <= 0 || !confirmPhrase) return bad("Invalid safety settings", 409);

  if (mode === "apply") {
    const applyAllowedTasks = new Set<TaskType>([
      "package_txn.update_note_only",
      "ticket.append_followup_note",
      "class_session.create_single",
      "class_session.reschedule",
      "student.quick_schedule",
    ]);
    if (!applyAllowedTasks.has(taskType)) {
      const msg = "Apply is disabled for this task type. Use preview only.";
      await prisma.auditLog.create({
        data: {
          actorEmail: actor.email,
          actorName: actor.name,
          actorRole: actor.role,
          module: "ops-gateway",
          action: "apply-blocked",
          entityType: taskType,
          entityId: operationId,
          meta: asJsonMeta({
            reason: msg,
            forceApply,
            maxAffected,
            confirmPhrase,
            confirmationText,
          }),
        },
      });
      return bad(msg, 409, { operationId, taskType });
    }

    if (!forceApply) return bad("Apply requires safety.forceApply=true", 409, { operationId, taskType });
    if (!confirmationText) return bad("Apply requires confirmationText", 409, { operationId, taskType });
    if (confirmationText !== confirmPhrase) {
      return bad("confirmationText does not match confirmPhrase", 409, { operationId, taskType });
    }
    if (maxAffected <= 0) return bad("Invalid safety.maxAffected", 409, { operationId, taskType });

    const applyResult =
      taskType === "package_txn.update_note_only"
        ? await applyPackageTxnNote(payload, maxAffected)
        : taskType === "ticket.append_followup_note"
          ? await applyTicketAppendNote(payload, maxAffected)
          : taskType === "class_session.create_single"
            ? await applyClassSessionCreate(payload, maxAffected)
            : taskType === "class_session.reschedule"
              ? await applyClassSessionReschedule(payload, maxAffected)
              : await applyStudentQuickSchedule(payload, maxAffected, isStrictSuperAdmin(actor));

    if ("error" in applyResult) {
      const errMsg = applyResult.error ?? "Apply failed";
      const errStatus = applyResult.status ?? 409;
      await prisma.auditLog.create({
        data: {
          actorEmail: actor.email,
          actorName: actor.name,
          actorRole: actor.role,
          module: "ops-gateway",
          action: "apply-failed",
          entityType: taskType,
          entityId: operationId,
          meta: asJsonMeta({
            payload,
            safety,
            error: errMsg,
          }),
        },
      });
      return bad(errMsg, errStatus, { operationId, taskType });
    }

    await prisma.auditLog.create({
      data: {
        actorEmail: actor.email,
        actorName: actor.name,
        actorRole: actor.role,
        module: "ops-gateway",
        action: "apply",
        entityType: taskType,
        entityId: operationId,
        meta: asJsonMeta({
          payload,
          safety,
          affectedCount: applyResult.affectedCount,
          sampleIds: applyResult.sampleIds,
        }),
      },
    });

    const applied = applyResult as {
      affectedCount: number;
      sampleIds: string[];
      changesetAfter: unknown[];
    };

    return Response.json({
      ok: true,
      shadowMode: false,
      operationId,
      taskType,
      status: "applied",
      affectedCount: applied.affectedCount,
      sampleIds: applied.sampleIds,
      changesetAfter: applied.changesetAfter,
    });
  }

  // preview
  if (mode !== "preview") {
    const msg = "Unsupported mode";
    await prisma.auditLog.create({
      data: {
        actorEmail: actor.email,
        actorName: actor.name,
        actorRole: actor.role,
        module: "ops-gateway",
        action: "invalid-mode",
        entityType: taskType,
        entityId: operationId,
        meta: asJsonMeta({
          reason: msg,
        }),
      },
    });
    return bad(msg, 409, { operationId, taskType });
  }

  let preview:
    | {
        affectedCount: number;
        sampleIds: string[];
        changesetPreview: unknown[];
        details?: unknown;
      }
    | { error: string; status: number };

  if (taskType === "attendance.update_status") {
    preview = await previewAttendanceStatus(payload);
  } else if (taskType === "session.replace_teacher_single") {
    preview = await previewSessionReplaceTeacher(payload);
  } else if (taskType === "package_txn.update_note_only") {
    preview = await previewPackageTxnNote(payload);
  } else if (taskType === "partner_settlement.mark_exported") {
    preview = await previewPartnerSettlementExport(payload);
  } else if (taskType === "class_session.create_single") {
    preview = await previewClassSessionCreate(payload);
  } else if (taskType === "class_session.reschedule") {
    preview = await previewClassSessionReschedule(payload);
  } else if (taskType === "student.quick_schedule") {
    preview = await previewStudentQuickSchedule(payload, isStrictSuperAdmin(actor));
  } else {
    preview = await previewTicketAppendNote(payload);
  }

  if ("error" in preview) {
    await prisma.auditLog.create({
      data: {
        actorEmail: actor.email,
        actorName: actor.name,
        actorRole: actor.role,
        module: "ops-gateway",
        action: "preview-failed",
        entityType: taskType,
        entityId: operationId,
        meta: asJsonMeta({ payload, safety, error: preview.error }),
      },
    });
    return bad(preview.error, preview.status, { operationId, taskType });
  }

  const riskLevel =
    preview.affectedCount > maxAffected ? "high" : preview.affectedCount > Math.max(1, Math.floor(maxAffected / 2)) ? "medium" : "low";

  await prisma.auditLog.create({
    data: {
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      module: "ops-gateway",
      action: "preview",
      entityType: taskType,
      entityId: operationId,
      meta: asJsonMeta({
        payload,
        safety,
        preview: {
          affectedCount: preview.affectedCount,
          sampleIds: preview.sampleIds,
        },
        riskLevel,
      }),
    },
  });

  return Response.json({
    ok: true,
    shadowMode: true,
    operationId,
    taskType,
    status: "preview_ready",
    affectedCount: preview.affectedCount,
    maxAffected,
    withinLimit: preview.affectedCount <= maxAffected,
    sampleIds: preview.sampleIds,
    changesetPreview: preview.changesetPreview,
    details: preview.details ?? null,
    safety: {
      forceApplyRequired: true,
      confirmationRequired: true,
      confirmPhrase,
    },
    riskLevel,
  });
}
