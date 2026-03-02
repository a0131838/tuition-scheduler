import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { AttendanceStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit-log";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (user.role !== "ADMIN") return bad("Only admin can delete session", 403);
  const { id: sessionId } = await params;
  if (!sessionId) return bad("Missing sessionId");

  const existing = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      classId: true,
      startAt: true,
      endAt: true,
      class: { select: { course: { select: { name: true } }, subject: { select: { name: true } }, level: { select: { name: true } } } },
    },
  });
  if (!existing) return bad("Session not found", 404);

  const [unsafeAttendanceCount, packageTxnCount, feedbackCount, teacherChangeCount] = await prisma.$transaction([
    prisma.attendance.count({
      where: {
        sessionId,
        OR: [
          { status: { not: AttendanceStatus.UNMARKED } },
          { deductedMinutes: { gt: 0 } },
          { deductedCount: { gt: 0 } },
          { excusedCharge: true },
          { packageId: { not: null } },
        ],
      },
    }),
    prisma.packageTxn.count({ where: { sessionId } }),
    prisma.sessionFeedback.count({ where: { sessionId } }),
    prisma.sessionTeacherChange.count({ where: { sessionId } }),
  ]);

  if (unsafeAttendanceCount > 0 || packageTxnCount > 0 || feedbackCount > 0 || teacherChangeCount > 0) {
    return bad("Session has linked records; use Cancel instead of Delete", 409, {
      code: "SESSION_DELETE_BLOCKED",
      detail: {
        unsafeAttendanceCount,
        packageTxnCount,
        feedbackCount,
        teacherChangeCount,
      },
    });
  }

  try {
    await prisma.session.delete({ where: { id: sessionId } });
    await logAudit({
      actor: { email: user.email, name: user.name, role: user.role },
      module: "session",
      action: "delete_safe",
      entityType: "Session",
      entityId: sessionId,
      meta: {
        classId: existing.classId,
        startAt: existing.startAt.toISOString(),
        endAt: existing.endAt.toISOString(),
        course: existing.class.course.name,
        subject: existing.class.subject?.name ?? null,
        level: existing.class.level?.name ?? null,
      },
    });
  } catch (e: any) {
    return bad(String(e?.message ?? "Delete failed"), 500);
  }

  return Response.json({ ok: true });
}
