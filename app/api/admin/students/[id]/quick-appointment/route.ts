import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStrictSuperAdmin, requireAdmin } from "@/lib/auth";
import { getOrCreateOneOnOneClassForStudent } from "@/lib/oneOnOne";
import { findStudentCourseEnrollment, formatEnrollmentConflict } from "@/lib/enrollment-conflict";
import { getSchedulablePackageDecision } from "@/lib/scheduling-package";
import {
  isExactSessionTimeslot,
  pickStudentSessionConflict,
  pickTeacherSessionConflict,
  shouldIgnoreTeacherConflictSession,
} from "@/lib/session-conflict";
import { campusRequiresRoom } from "@/lib/campus";
import { runRejectQuickScheduleBatch, runSkipQuickScheduleBatch } from "@/lib/quick-schedule-execution";
import { isSessionDuplicateError } from "@/lib/session-unique";
import { checkTeacherSchedulingAvailability } from "@/lib/teacher-scheduling-availability";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseDatetimeLocal(s: string) {
  const [date, time] = s.split("T");
  const [Y, M, D] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Y, M - 1, D, hh, mm, 0, 0);
}

function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function fmtDateInput(d: Date | null) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatSessionConflictLabel(s: any) {
  const cls = s.class;
  const classLabel = `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
  const roomLabel = cls.room?.name ?? "(none)";
  const timeLabel = `${fmtDateInput(s.startAt)} ${fmtHHMM(s.startAt)}-${fmtHHMM(s.endAt)}`;
  return `${classLabel} | ${cls.teacher.name} | ${cls.campus.name} / ${roomLabel} | ${timeLabel}`;
}

function formatStudentSessionConflictReason(s: any, startAt: Date, endAt: Date) {
  const label = formatSessionConflictLabel(s);
  if (isExactSessionTimeslot(s, startAt, endAt)) {
    return `Session already exists at this time: ${label}`;
  }
  return `Student already has another session at this time: ${label}`;
}

type DbClient = typeof prisma | Prisma.TransactionClient;

class QuickScheduleConflictError extends Error {
  status = 409;
}

async function checkTeacherAvailability(db: DbClient, teacherId: string, startAt: Date, endAt: Date) {
  return checkTeacherSchedulingAvailability(db, teacherId, startAt, endAt);
}

function canTeachSubject(teacher: any, subjectId?: string | null) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  if (Array.isArray(teacher?.subjects)) {
    return teacher.subjects.some((s: any) => s?.id === subjectId);
  }
  return false;
}

async function validateQuickScheduleRow(
  db: DbClient,
  opts: {
    classId: string;
    teacherId: string;
    studentId: string;
    courseId: string;
    roomId: string | null;
    startAt: Date;
    endAt: Date;
    durationMin: number;
    bypassAvailabilityCheck: boolean;
  }
) {
  const { classId, teacherId, studentId, courseId, roomId, startAt, endAt, durationMin, bypassAvailabilityCheck } = opts;
  let reason = "";

  if (!reason) {
    const studentSessionConflicts = await db.session.findMany({
      where: {
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        OR: [
          { studentId },
          { class: { oneOnOneStudentId: studentId } },
          { class: { enrollments: { some: { studentId } } } },
          { attendances: { some: { studentId } } },
        ],
      },
      include: {
        class: {
          include: {
            course: true,
            subject: true,
            level: true,
            teacher: true,
            campus: true,
            room: true,
            enrollments: { select: { studentId: true } },
          },
        },
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
      orderBy: { startAt: "asc" },
    });
    const studentSessionConflict = pickStudentSessionConflict(studentSessionConflicts, studentId);
    if (studentSessionConflict) {
      reason = formatStudentSessionConflictReason(studentSessionConflict, startAt, endAt);
    }
  }

  if (!reason && !bypassAvailabilityCheck) {
    const availErr = await checkTeacherAvailability(db, teacherId, startAt, endAt);
    if (availErr) reason = availErr;
  }

  if (!reason) {
    const teacherSessionConflicts = await db.session.findMany({
      where: {
        OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      include: {
        class: {
          include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true, enrollments: { select: { studentId: true } } },
        },
        attendances: {
          select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true },
        },
      },
      orderBy: { startAt: "asc" },
    });
    const teacherSessionConflict = teacherSessionConflicts.find((s) => !shouldIgnoreTeacherConflictSession(s, studentId));
    if (teacherSessionConflict) reason = `Teacher conflict: ${formatSessionConflictLabel(teacherSessionConflict)}`;
  }

  if (!reason) {
    const teacherApptConflict = await db.appointment.findFirst({
      where: {
        teacherId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { startAt: true, endAt: true },
    });
    if (teacherApptConflict) {
      const timeLabel = `${fmtDateInput(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(
        teacherApptConflict.endAt
      )}`;
      reason = `Teacher conflict: appointment ${timeLabel}`;
    }
  }

  if (!reason && roomId) {
    const roomConflicts = await db.session.findMany({
      where: {
        class: { roomId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      include: {
        attendances: {
          select: {
            studentId: true,
            status: true,
            excusedCharge: true,
            deductedMinutes: true,
            deductedCount: true,
          },
        },
        class: {
          include: {
            course: true,
            subject: true,
            level: true,
            teacher: true,
            campus: true,
            room: true,
            enrollments: { select: { studentId: true } },
          },
        },
      },
    });
    const roomConflict = pickTeacherSessionConflict(roomConflicts);
    if (roomConflict) reason = `Room conflict: ${formatSessionConflictLabel(roomConflict)}`;
  }

  if (!reason) {
    const packageCheckAt = startAt.getTime() < Date.now() ? new Date() : startAt;
    const packageDecision = await getSchedulablePackageDecision(db, {
      studentId,
      courseId,
      at: packageCheckAt,
      requiredHoursMinutes: durationMin,
    });
    if (!packageDecision.ok) {
      reason = packageDecision.message;
    }
  }

  if (!reason) {
    const dupSession = await db.session.findFirst({
      where: { classId, startAt, endAt },
      select: { id: true },
    });
    if (dupSession) reason = "Session already exists at this time";
  }

  return reason;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id: studentId } = await params;
  if (!studentId) return bad("Missing studentId");
  const bypassAvailabilityCheck = isStrictSuperAdmin(user);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const teacherId = String(body?.teacherId ?? "");
  const subjectId = String(body?.subjectId ?? "");
  const levelIdRaw = String(body?.levelId ?? "");
  const campusId = String(body?.campusId ?? "");
  const roomIdRaw = String(body?.roomId ?? "");
  const startAtStr = String(body?.startAt ?? "");
  const durationMin = Number(body?.durationMin ?? 60);
  const mode = String(body?.mode ?? "create");
  const repeatWeeksRaw = Number(body?.repeatWeeks ?? 1);
  const repeatWeeks = Number.isFinite(repeatWeeksRaw) ? Math.max(1, Math.min(16, Math.floor(repeatWeeksRaw))) : 1;
  const onConflict = String(body?.onConflict ?? "reject");

  if (!teacherId || !subjectId || !campusId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
    return bad("Invalid input");
  }
  if (mode !== "create" && mode !== "preview") return bad("Invalid mode");
  if (onConflict !== "reject" && onConflict !== "skip") return bad("Invalid onConflict");

  const roomId = roomIdRaw || null;
  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  if (!campus) return bad("Campus not found", 404);
  if (!roomId && campusRequiresRoom(campus)) return bad("Room is required", 409);
  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.campusId !== campusId) return bad("Invalid room", 409);
  }

  const startAt = parseDatetimeLocal(startAtStr);
  if (Number.isNaN(startAt.getTime())) return bad("Invalid startAt", 409);

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { subjects: true },
  });
  if (!teacher) return bad("Teacher not found", 404);
  if (!canTeachSubject(teacher, subjectId)) return bad("Teacher cannot teach this course", 409);

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, courseId: true },
  });
  if (!subject) return bad("Invalid subject", 409);

  let levelId: string | null = null;
  if (levelIdRaw) {
    const level = await prisma.level.findUnique({ where: { id: levelIdRaw } });
    if (!level || level.subjectId !== subjectId) return bad("Invalid subject or level", 409);
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
      const conflict = await findStudentCourseEnrollment(studentId, courseId, undefined, subjectId, teacherId, "ONE_ON_ONE");
      return bad("Course enrollment conflict", 409, {
        code: "COURSE_CONFLICT",
        detail: conflict ? formatEnrollmentConflict(conflict) : undefined,
      });
    }
    return bad(msg || "Quick schedule failed", 500);
  }
  if (!cls) return bad("Failed to create class", 500);

  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const rows: Array<{ index: number; startAt: string; endAt: string; ok: boolean; reason?: string; created?: boolean }> = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < repeatWeeks; i++) {
    const currentStart = new Date(startAt.getTime() + i * oneWeekMs);
    const currentEnd = new Date(currentStart.getTime() + durationMin * 60 * 1000);
    const reason = await validateQuickScheduleRow(prisma, {
      classId: cls.id,
      teacherId,
      studentId,
      courseId,
      roomId,
      startAt: currentStart,
      endAt: currentEnd,
      durationMin,
      bypassAvailabilityCheck,
    });

    if (reason) {
      rows.push({
        index: i + 1,
        startAt: currentStart.toISOString(),
        endAt: currentEnd.toISOString(),
        ok: false,
        reason,
      });
      if (mode === "create" && onConflict === "reject") {
        return bad(reason, 409);
      }
      skipped++;
      continue;
    }

    if (mode === "create" && onConflict === "reject") {
      try {
        const createdRows = await prisma.$transaction(async (tx) => {
          const txResult = await runRejectQuickScheduleBatch({
            total: repeatWeeks - i,
            makeRow: async (offset) => {
              const j = i + offset;
              const txStart = new Date(startAt.getTime() + j * oneWeekMs);
              const txEnd = new Date(txStart.getTime() + durationMin * 60 * 1000);
              const txReason = await validateQuickScheduleRow(tx, {
                classId: cls.id,
                teacherId,
                studentId,
                courseId,
                roomId,
                startAt: txStart,
                endAt: txEnd,
                durationMin,
                bypassAvailabilityCheck,
              });
              if (txReason) return { reason: txReason, created: null as never };
              await tx.session.create({
                data: {
                  classId: cls.id,
                  startAt: txStart,
                  endAt: txEnd,
                  studentId,
                  teacherId: teacherId === cls.teacherId ? null : teacherId,
                },
              });
              return {
                created: {
                  index: j + 1,
                  startAt: txStart.toISOString(),
                  endAt: txEnd.toISOString(),
                  ok: true,
                  created: true,
                },
              };
            },
          });
          if (!txResult.ok) throw new QuickScheduleConflictError(txResult.reason);
          return txResult.createdRows;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        created += createdRows.length;
        rows.push(...createdRows);
      } catch (error) {
        if (error instanceof QuickScheduleConflictError) return bad(error.message, error.status);
        if (isSessionDuplicateError(error)) return bad("Session already exists at this time", 409);
        throw error;
      }
      break;
    }

    if (mode === "create") {
      const batchResult: { createdRows: boolean[]; skippedReasons: string[] } = await prisma.$transaction(async (tx) => {
        return runSkipQuickScheduleBatch({
          total: 1,
          makeRow: async () => {
            const txReason = await validateQuickScheduleRow(tx, {
              classId: cls.id,
              teacherId,
              studentId,
              courseId,
              roomId,
              startAt: currentStart,
              endAt: currentEnd,
              durationMin,
              bypassAvailabilityCheck,
            });
            if (txReason) return { ok: false as const, reason: txReason };
            await tx.session.create({
              data: {
                classId: cls.id,
                startAt: currentStart,
                endAt: currentEnd,
                studentId,
                teacherId: teacherId === cls.teacherId ? null : teacherId,
              },
            });
            return { ok: true as const, created: true };
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error) => {
        if (isSessionDuplicateError(error)) {
          return { createdRows: [], skippedReasons: ["Session already exists at this time"] };
        }
        throw error;
      });
      if (batchResult.skippedReasons.length > 0) {
        rows.push({
          index: i + 1,
          startAt: currentStart.toISOString(),
          endAt: currentEnd.toISOString(),
          ok: false,
          reason: batchResult.skippedReasons[0],
        });
        skipped++;
        continue;
      }
      created++;
      rows.push({
        index: i + 1,
        startAt: currentStart.toISOString(),
        endAt: currentEnd.toISOString(),
        ok: true,
        created: true,
      });
    } else {
      rows.push({
        index: i + 1,
        startAt: currentStart.toISOString(),
        endAt: currentEnd.toISOString(),
        ok: true,
      });
    }
  }

  return Response.json({
    ok: true,
    mode,
    created,
    skipped,
    total: repeatWeeks,
    rows,
  });
}
