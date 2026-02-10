import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { findStudentCourseEnrollment, formatEnrollmentConflict } from "@/lib/enrollment-conflict";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const classId = String(body?.classId ?? "");
  const studentId = String(body?.studentId ?? "");
  if (!classId || !studentId) return bad("Missing classId or studentId");

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { courseId: true },
  });
  if (!cls) return bad("Class not found", 404);

  const exists = await prisma.enrollment.findFirst({
    where: { classId, studentId },
    select: { id: true },
  });

  if (!exists) {
    const courseConflict = await findStudentCourseEnrollment(studentId, cls.courseId, classId);
    if (courseConflict) {
      return bad("Course enrollment conflict", 409, { code: "COURSE_CONFLICT", detail: formatEnrollmentConflict(courseConflict) });
    }
    const created = await prisma.enrollment.create({
      data: { classId, studentId },
      select: { id: true, classId: true, studentId: true },
    });
    return Response.json({ ok: true, enrollment: created }, { status: 201 });
  }

  return Response.json({ ok: true, enrollment: exists });
}

