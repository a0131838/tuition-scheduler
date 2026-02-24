import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { AttendanceStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit-log";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, teacher } = await requireTeacherProfile();
  if (!teacher) return bad("Teacher profile not linked", 403);

  const { id: sessionId } = await ctx.params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const items = Array.isArray(body?.items) ? (body.items as any[]) : [];
  if (items.length === 0) return bad("No items", 409);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: true, attendances: true },
  });
  if (!session) return bad("Session not found", 404);

  const allowed = session.teacherId === teacher.id || (!session.teacherId && session.class.teacherId === teacher.id);
  if (!allowed) return bad("No permission", 403);

  const enrollments = await prisma.enrollment.findMany({ where: { classId: session.classId } });
  const attendanceEnrollments =
    session.class.capacity === 1 && session.studentId
      ? enrollments.filter((e) => e.studentId === session.studentId)
      : enrollments;
  const expected = new Set(attendanceEnrollments.map((e) => e.studentId));

  for (const it of items) {
    const studentId = String(it?.studentId ?? "");
    if (!studentId || !expected.has(studentId)) continue;

    const statusRaw = String(it?.status ?? "UNMARKED");
    const note = String(it?.note ?? "").trim() || null;
    const status = (Object.values(AttendanceStatus) as string[]).includes(statusRaw)
      ? (statusRaw as AttendanceStatus)
      : "UNMARKED";

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
    actor: { email: user.email, name: user.name, role: user.role },
    module: "ATTENDANCE",
    action: "TEACHER_SAVE",
    entityType: "Session",
    entityId: sessionId,
    meta: { submittedItemCount: items.length, expectedStudentCount: expected.size },
  });

  return Response.json({ ok: true, savedAt: new Date().toISOString() });
}
