import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { AttendanceStatus } from "@prisma/client";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  const { teacher } = await requireTeacherProfile();
  if (!teacher) return bad("Teacher profile not linked", 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const sessionId = String(body?.sessionId ?? "");
  const status = String(body?.status ?? "");
  const studentIds = Array.isArray(body?.studentIds) ? (body.studentIds as any[]).map(String) : [];

  if (!sessionId) return bad("Missing sessionId", 409);
  if (status !== "ABSENT" && status !== "EXCUSED") return bad("Invalid status", 409);
  if (studentIds.length === 0) return bad("No target students", 409);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: true },
  });
  if (!session) return bad("Session not found", 404);

  const allowed = session.teacherId === teacher.id || (!session.teacherId && session.class.teacherId === teacher.id);
  if (!allowed) return bad("No permission", 403);

  const enrollments = await prisma.enrollment.findMany({
    where: { classId: session.classId },
    select: { studentId: true },
  });
  const expectedSet = new Set(
    session.class.capacity === 1 && session.studentId ? [session.studentId] : enrollments.map((e) => e.studentId)
  );

  const targetIds = Array.from(new Set(studentIds.map((s) => s.trim()).filter((s) => s && expectedSet.has(s))));
  if (targetIds.length === 0) return bad("No target students", 409);

  const autoNote = `[Quick mark from alerts @ ${new Date().toLocaleString()}]`;
  await prisma.$transaction(
    targetIds.map((studentId) =>
      prisma.attendance.upsert({
        where: { sessionId_studentId: { sessionId, studentId } },
        update: { status: status as AttendanceStatus, note: autoNote },
        create: {
          sessionId,
          studentId,
          status: status as AttendanceStatus,
          note: autoNote,
          deductedCount: 0,
          deductedMinutes: 0,
        },
      })
    )
  );

  return Response.json({ ok: true, updatedCount: targetIds.length });
}

