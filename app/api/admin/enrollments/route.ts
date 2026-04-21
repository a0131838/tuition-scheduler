import { prisma } from "@/lib/prisma";
import { isStrictSuperAdmin, requireAdmin } from "@/lib/auth";
import { classTeachingMode, findStudentCourseEnrollment, formatEnrollmentConflict } from "@/lib/enrollment-conflict";
import { getSchedulablePackageDecision } from "@/lib/scheduling-package";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  const bypassPackageGate = isStrictSuperAdmin(user);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const classId = String(body?.classId ?? "");
  const studentId = String(body?.studentId ?? "");

  if (!classId || !studentId) {
    return bad("Missing classId or studentId");
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, courseId: true, subjectId: true, teacherId: true, capacity: true },
  });
  if (!cls) return bad("Class not found", 404);

  const now = new Date();
  const packageDecision = await getSchedulablePackageDecision(prisma, {
    studentId,
    courseId: cls.courseId,
    at: now,
    requiredHoursMinutes: cls.capacity === 1 ? 60 : 1,
  });
  if (!packageDecision.ok && !(bypassPackageGate && packageDecision.code === "PACKAGE_FINANCE_GATE_BLOCKED")) {
    return bad(packageDecision.message, 409, { code: packageDecision.code, packageId: packageDecision.packageId });
  }

  const exists = await prisma.enrollment.findFirst({
    where: { classId, studentId },
    select: { id: true },
  });
  if (exists) return bad("Already enrolled", 409, { code: "ALREADY_ENROLLED" });

  const courseConflict = await findStudentCourseEnrollment(
    studentId,
    cls.courseId,
    classId,
    cls.subjectId,
    cls.teacherId,
    classTeachingMode(cls.capacity)
  );
  if (courseConflict) {
    return bad("Course enrollment conflict", 409, { code: "COURSE_CONFLICT", detail: formatEnrollmentConflict(courseConflict) });
  }

  const created = await prisma.enrollment.create({
    data: { classId, studentId },
    select: { id: true, classId: true, studentId: true },
  });

  return Response.json({ ok: true, enrollment: created }, { status: 201 });
}

export async function DELETE(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const classId = String(body?.classId ?? "");
  const studentId = String(body?.studentId ?? "");
  if (!classId || !studentId) return bad("Missing classId or studentId");

  const result = await prisma.enrollment.deleteMany({ where: { classId, studentId } });
  return Response.json({ ok: true, deleted: result.count });
}
