import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { classTeachingMode, findStudentCourseEnrollment, formatEnrollmentConflict } from "@/lib/enrollment-conflict";
import { getSchedulablePackageDecision } from "@/lib/scheduling-package";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();

  const { id: classId } = await params;
  const { searchParams } = new URL(req.url);
  const studentId = String(searchParams.get("studentId") ?? "");
  if (!classId || !studentId) return bad("Missing classId or studentId");

  const [cls, student] = await Promise.all([
    prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, courseId: true, subjectId: true, teacherId: true, capacity: true },
    }),
    prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, grade: true },
    }),
  ]);

  if (!cls) return bad("Class not found", 404);
  if (!student) return bad("Student not found", 404);

  const exists = await prisma.enrollment.findFirst({
    where: { classId, studentId },
    select: { id: true },
  });
  if (exists) {
    return Response.json({
      ok: true,
      preview: {
        canEnroll: false,
        studentName: student.name,
        studentGrade: student.grade ?? null,
        reasonCode: "ALREADY_ENROLLED",
        reasonText: "该学生已经在当前班级，无需重复添加。",
        detail: null,
      },
    });
  }

  const courseConflict = await findStudentCourseEnrollment(
    studentId,
    cls.courseId,
    classId,
    cls.subjectId,
    cls.teacherId,
    classTeachingMode(cls.capacity)
  );
  if (courseConflict) {
    return Response.json({
      ok: true,
      preview: {
        canEnroll: false,
        studentName: student.name,
        studentGrade: student.grade ?? null,
        reasonCode: "COURSE_CONFLICT",
        reasonText: "该学生已报名同老师、同课程/同科目、同班型班级。",
        detail: formatEnrollmentConflict(courseConflict),
      },
    });
  }

  const packageDecision = await getSchedulablePackageDecision(prisma, {
    studentId,
    courseId: cls.courseId,
    at: new Date(),
    requiredHoursMinutes: cls.capacity === 1 ? 60 : 1,
  });

  if (!packageDecision.ok) {
    return Response.json({
      ok: true,
      preview: {
        canEnroll: false,
        studentName: student.name,
        studentGrade: student.grade ?? null,
        reasonCode: packageDecision.code,
        reasonText:
          packageDecision.code === "PACKAGE_FINANCE_GATE_BLOCKED"
            ? "该学生课包发票待审批，请先打开课包账单处理后再加入班级。"
            : "该学生当前没有这个课程的有效课包。",
        detail: null,
      },
    });
  }

  return Response.json({
    ok: true,
    preview: {
      canEnroll: true,
      studentName: student.name,
      studentGrade: student.grade ?? null,
      reasonCode: "OK",
      reasonText: "该学生当前可以加入这个班级。",
      detail: null,
    },
  });
}
