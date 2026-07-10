import { AttendanceStatus } from "@prisma/client";
import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getCancelledSessionStudentIds } from "@/lib/session-students";

async function getAllowedSession(sessionId: string, teacherId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      student: true,
      attendances: true,
      class: {
        include: {
          course: true,
          subject: true,
          enrollments: { include: { student: true }, orderBy: { student: { name: "asc" } } },
        },
      },
    },
  });
  if (!session) return null;
  const allowed = session.teacherId === teacherId || (!session.teacherId && session.class.teacherId === teacherId);
  return allowed ? session : null;
}

function attendanceRows(session: NonNullable<Awaited<ReturnType<typeof getAllowedSession>>>) {
  const cancelledSet = getCancelledSessionStudentIds(session);
  const enrollments =
    session.class.capacity === 1 && session.studentId
      ? session.class.enrollments.filter((e) => e.studentId === session.studentId)
      : session.class.enrollments;
  const attMap = new Map(session.attendances.map((a) => [a.studentId, a]));

  return enrollments
    .filter((e) => !cancelledSet.has(e.studentId))
    .map((e) => {
      const row = attMap.get(e.studentId);
      return {
        studentId: e.studentId,
        studentName: e.student.name,
        status: row?.status ?? "UNMARKED",
        note: row?.note ?? "",
      };
    });
}

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!auth.user.teacherId) return bad("Teacher profile not linked", 403);

  const { sessionId } = await ctx.params;
  const session = await getAllowedSession(sessionId, auth.user.teacherId);
  if (!session) return bad("Session not found or no permission", 404);

  return ok({
    session: {
      id: session.id,
      courseLabel: [session.class.course?.name, session.class.subject?.name].filter(Boolean).join(" / "),
    },
    rows: attendanceRows(session),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!auth.user.teacherId) return bad("Teacher profile not linked", 403);

  const { sessionId } = await ctx.params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const session = await getAllowedSession(sessionId, auth.user.teacherId);
  if (!session) return bad("Session not found or no permission", 404);

  const expected = new Set(attendanceRows(session).map((row) => row.studentId));
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) return bad("No items", 409);

  for (const item of items) {
    const studentId = String(item?.studentId ?? "");
    if (!studentId || !expected.has(studentId)) continue;

    const statusRaw = String(item?.status ?? "UNMARKED");
    const status = Object.values(AttendanceStatus).includes(statusRaw as AttendanceStatus)
      ? (statusRaw as AttendanceStatus)
      : AttendanceStatus.UNMARKED;
    const note = String(item?.note ?? "").trim() || null;
    const existing = session.attendances.find((a) => a.studentId === studentId);

    await prisma.attendance.upsert({
      where: { sessionId_studentId: { sessionId, studentId } },
      update: {
        status,
        note,
        deductedCount: existing?.deductedCount ?? 0,
        deductedMinutes: existing?.deductedMinutes ?? 0,
        packageId: existing?.packageId ?? null,
      },
      create: {
        sessionId,
        studentId,
        status,
        note,
        deductedCount: 0,
        deductedMinutes: 0,
      },
    });
  }

  await logAudit({
    actor: { email: auth.user.email, name: auth.user.name, role: auth.user.role },
    module: "ATTENDANCE",
    action: "MINIAPP_TEACHER_SAVE",
    entityType: "Session",
    entityId: sessionId,
    meta: { submittedItemCount: items.length, expectedStudentCount: expected.size },
  });

  const refreshed = await getAllowedSession(sessionId, auth.user.teacherId);
  return ok({
    savedAt: new Date().toISOString(),
    rows: refreshed ? attendanceRows(refreshed) : [],
  });
}
