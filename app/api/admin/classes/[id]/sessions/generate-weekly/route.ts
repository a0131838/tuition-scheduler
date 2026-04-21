import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStrictSuperAdmin, requireAdmin } from "@/lib/auth";
import { pickTeacherSessionConflict } from "@/lib/session-conflict";
import { getSchedulablePackageDecision } from "@/lib/scheduling-package";
import { isSessionDuplicateError } from "@/lib/session-unique";
import { checkTeacherSchedulingAvailability } from "@/lib/teacher-scheduling-availability";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseDateOnly(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}

function parseTimeHHMM(s: string) {
  const [hh, mm] = s.split(":").map(Number);
  return { hh, mm };
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

type DbClient = typeof prisma | Prisma.TransactionClient;

class GenerateWeeklyConflictError extends Error {
  code = "CONFLICT";
}

async function checkTeacherAvailability(db: DbClient, teacherId: string, startAt: Date, endAt: Date) {
  return checkTeacherSchedulingAvailability(db, teacherId, startAt, endAt);
}

async function findConflictForSession(opts: {
  db?: DbClient;
  classId: string;
  teacherId: string;
  roomId: string | null;
  startAt: Date;
  endAt: Date;
  schedulingStudentId?: string | null;
}) {
  const { db = prisma, classId, teacherId, roomId, startAt, endAt, schedulingStudentId } = opts;

  const availErr = await checkTeacherAvailability(db, teacherId, startAt, endAt);
  if (availErr) return availErr;

  const dup = await db.session.findFirst({
    where: { classId, startAt, endAt },
    select: { id: true },
  });
  if (dup) return `Session already exists at ${ymd(startAt)} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}`;

  const teacherSessionConflicts = await db.session.findMany({
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

  const teacherApptConflict = await db.appointment.findFirst({
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
    const roomSessionConflicts = await db.session.findMany({
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const bypassPackageGate = isStrictSuperAdmin(user);
  const { id: classId } = await params;
  if (!classId) return bad("Missing classId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const startDateStr = String(body?.startDate ?? "");
  const weekday = Number(body?.weekday ?? 1);
  const timeStr = String(body?.time ?? "19:00");
  const weeks = Number(body?.weeks ?? 8);
  const durationMin = Number(body?.durationMin ?? 60);
  const onConflict = String(body?.onConflict ?? "reject");
  const studentId = String(body?.studentId ?? "");

  if (
    !startDateStr ||
    !Number.isFinite(weekday) ||
    weekday < 1 ||
    weekday > 7 ||
    !timeStr ||
    !Number.isFinite(weeks) ||
    weeks <= 0 ||
    weeks > 52 ||
    !Number.isFinite(durationMin) ||
    durationMin < 15
  ) {
    return bad("Invalid input");
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { teacher: true, room: true, course: true, subject: true, level: true, enrollments: { select: { studentId: true } } },
  });
  if (!cls) return bad("Class not found", 404);

  if (cls.capacity === 1) {
    if (!studentId) return bad("Please select a student", 409);
    const enrolled = await prisma.enrollment.findFirst({
      where: { classId, studentId },
      select: { id: true },
    });
    if (!enrolled) return bad("Student not enrolled in this class", 409);
  }

  const startDate = parseDateOnly(startDateStr);
  if (Number.isNaN(startDate.getTime())) return bad("Invalid startDate");
  const { hh, mm } = parseTimeHHMM(timeStr);

  const ourToJs = (our: number) => (our === 7 ? 0 : our);

  const first = new Date(startDate);
  const targetJs = ourToJs(weekday);
  while (first.getDay() !== targetJs) first.setDate(first.getDate() + 1);

  let created = 0;
  let skipped = 0;
  const skippedSamples: string[] = [];
  const expectedStudentIds =
    cls.capacity === 1 ? [studentId] : Array.from(new Set(cls.enrollments.map((e) => e.studentId).filter(Boolean)));
  const requiredHoursMinutes = cls.capacity === 1 ? durationMin : 1;
  const plannedRows: Array<{ startAt: Date; endAt: Date }> = [];

  for (let i = 0; i < weeks; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i * 7);

    const startAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);
    const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

    let packageErr: string | null = null;
    let packageCode: string | null = null;
    for (const sid of expectedStudentIds) {
      const packageDecision = await getSchedulablePackageDecision(prisma, {
        studentId: sid,
        courseId: cls.courseId,
        at: startAt,
        requiredHoursMinutes,
      });
      if (!packageDecision.ok && !(bypassPackageGate && packageDecision.code === "PACKAGE_FINANCE_GATE_BLOCKED")) {
        packageErr = packageDecision.message;
        packageCode = packageDecision.code;
        break;
      }
    }
    if (packageErr) {
      if (onConflict === "reject") {
        return bad(`Conflict on ${ymd(startAt)} ${timeStr}: ${packageErr}`, 409, { code: packageCode ?? "NO_ACTIVE_PACKAGE" });
      }
      skipped++;
      if (skippedSamples.length < 5) skippedSamples.push(`${ymd(startAt)} ${timeStr} - ${packageErr}`);
      continue;
    }

    const conflict = await findConflictForSession({
      classId,
      teacherId: cls.teacherId,
      roomId: cls.roomId ?? null,
      startAt,
      endAt,
      schedulingStudentId: cls.capacity === 1 ? studentId : null,
    });

    if (conflict) {
      if (onConflict === "reject") {
        return bad(`Conflict on ${ymd(startAt)} ${timeStr}: ${conflict}`, 409, { code: "CONFLICT" });
      }
      skipped++;
      if (skippedSamples.length < 5) skippedSamples.push(`${ymd(startAt)} ${timeStr} - ${conflict}`);
      continue;
    }

    if (onConflict === "reject") {
      plannedRows.push({ startAt, endAt });
      continue;
    }

    const result = await prisma.$transaction(
      async (tx) => {
        for (const sid of expectedStudentIds) {
          const packageDecision = await getSchedulablePackageDecision(tx, {
            studentId: sid,
            courseId: cls.courseId,
            at: startAt,
            requiredHoursMinutes,
          });
          if (!packageDecision.ok && !(bypassPackageGate && packageDecision.code === "PACKAGE_FINANCE_GATE_BLOCKED")) {
            return { ok: false as const, reason: packageDecision.message, code: packageDecision.code };
          }
        }

        const conflictNow = await findConflictForSession({
          db: tx,
          classId,
          teacherId: cls.teacherId,
          roomId: cls.roomId ?? null,
          startAt,
          endAt,
          schedulingStudentId: cls.capacity === 1 ? studentId : null,
        });
        if (conflictNow) return { ok: false as const, reason: conflictNow, code: "CONFLICT" as const };

        await tx.session.create({
          data: {
            classId,
            startAt,
            endAt,
            studentId: cls.capacity === 1 ? studentId : null,
          },
        });
        return { ok: true as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    ).catch((error) => {
      if (isSessionDuplicateError(error)) return { ok: false as const, reason: "Session already exists at this time", code: "CONFLICT" as const };
      throw error;
    });

    if (!result.ok) {
      skipped++;
      if (skippedSamples.length < 5) skippedSamples.push(`${ymd(startAt)} ${timeStr} - ${result.reason}`);
      continue;
    }
    created++;
  }

  if (onConflict === "reject" && plannedRows.length > 0) {
    try {
      await prisma.$transaction(
        async (tx) => {
          for (const row of plannedRows) {
            for (const sid of expectedStudentIds) {
              const packageDecision = await getSchedulablePackageDecision(tx, {
                studentId: sid,
                courseId: cls.courseId,
                at: row.startAt,
                requiredHoursMinutes,
              });
              if (!packageDecision.ok && !(bypassPackageGate && packageDecision.code === "PACKAGE_FINANCE_GATE_BLOCKED")) {
                throw new GenerateWeeklyConflictError(`Conflict on ${ymd(row.startAt)} ${timeStr}: ${packageDecision.message}`);
              }
            }

            const conflictNow = await findConflictForSession({
              db: tx,
              classId,
              teacherId: cls.teacherId,
              roomId: cls.roomId ?? null,
              startAt: row.startAt,
              endAt: row.endAt,
              schedulingStudentId: cls.capacity === 1 ? studentId : null,
            });
            if (conflictNow) {
              throw new GenerateWeeklyConflictError(`Conflict on ${ymd(row.startAt)} ${timeStr}: ${conflictNow}`);
            }

            await tx.session.create({
              data: {
                classId,
                startAt: row.startAt,
                endAt: row.endAt,
                studentId: cls.capacity === 1 ? studentId : null,
              },
            });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      created = plannedRows.length;
    } catch (error) {
      if (error instanceof GenerateWeeklyConflictError) {
        const code =
          error.message.includes("invoice approval") || error.message.includes("blocked")
            ? "PACKAGE_FINANCE_GATE_BLOCKED"
            : error.message.includes("active package")
              ? "NO_ACTIVE_PACKAGE"
              : "CONFLICT";
        return bad(error.message, 409, { code });
      }
      if (isSessionDuplicateError(error)) {
        return bad(`Conflict on ${timeStr}: Session already exists at this time`, 409, { code: "CONFLICT" });
      }
      throw error;
    }
  }

  const msg =
    onConflict === "skip"
      ? `Generated done: created=${created}, skipped=${skipped}.` + (skippedSamples.length ? ` Samples: ${skippedSamples.join(" | ")}` : "")
      : `Generated done: created=${created}.`;

  return Response.json({ ok: true, created, skipped, msg, skippedSamples });
}
