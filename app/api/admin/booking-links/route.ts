import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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

  const studentId = String(body?.studentId ?? "");
  const startDate = String(body?.startDate ?? "");
  const endDate = String(body?.endDate ?? "");
  const durationMin = Number(String(body?.durationMin ?? "60"));
  const slotStepMin = Number(String(body?.slotStepMin ?? "15"));
  const title = String(body?.title ?? "").trim() || null;
  const note = String(body?.note ?? "").trim() || null;
  const expiresAtRaw = String(body?.expiresAt ?? "").trim();
  const teacherIds: string[] = Array.isArray(body?.teacherIds)
    ? (Array.from(new Set((body.teacherIds as any[]).map((v: any) => String(v)).filter(Boolean))) as string[])
    : [];

  if (!studentId || !startDate || !endDate || teacherIds.length === 0) {
    return bad("Missing required fields", 409);
  }
  if (!Number.isFinite(durationMin) || durationMin < 15 || durationMin > 240) {
    return bad("Invalid duration", 409);
  }
  if (!Number.isFinite(slotStepMin) || slotStepMin < 5 || slotStepMin > 120) {
    return bad("Invalid slot step", 409);
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return bad("Invalid date range", 409);
  }

  let expiresAt: Date | null = null;
  if (expiresAtRaw) {
    const d = new Date(expiresAtRaw);
    if (!Number.isNaN(d.getTime())) expiresAt = d;
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      packages: {
        where: { status: "ACTIVE" },
        select: { courseId: true },
      },
    },
  });
  if (!student) return bad("Student not found", 404);

  const studentCourseIds = Array.from(new Set(student.packages.map((p) => p.courseId)));
  if (studentCourseIds.length === 0) {
    return bad("Student has no active course package", 409);
  }

  const selectedTeachers = await prisma.teacher.findMany({
    where: { id: { in: teacherIds } },
    select: {
      id: true,
      subjectCourse: { select: { courseId: true } },
      subjects: { select: { courseId: true } },
    },
  });
  const studentCourseSet = new Set(studentCourseIds);
  const validTeacherIds = selectedTeachers
    .filter((teacher) => {
      const courseIds = new Set<string>();
      if (teacher.subjectCourse?.courseId) courseIds.add(teacher.subjectCourse.courseId);
      for (const subject of teacher.subjects) courseIds.add(subject.courseId);
      for (const courseId of courseIds) {
        if (studentCourseSet.has(courseId)) return true;
      }
      return false;
    })
    .map((teacher) => teacher.id);

  if (validTeacherIds.length !== teacherIds.length || validTeacherIds.length === 0) {
    return bad("Some selected teachers cannot teach this student's courses", 409);
  }

  const token = crypto.randomBytes(20).toString("hex");
  const created = await prisma.studentBookingLink.create({
    data: {
      token,
      studentId,
      title,
      note,
      startDate: start,
      endDate: end,
      durationMin,
      slotStepMin,
      onlySelectedSlots: true,
      expiresAt,
      teachers: {
        create: validTeacherIds.map((teacherId) => ({ teacherId })),
      },
    },
    select: { id: true },
  });

  return Response.json({ ok: true, id: created.id }, { status: 201 });
}
