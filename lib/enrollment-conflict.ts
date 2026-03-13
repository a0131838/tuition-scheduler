import { prisma } from "@/lib/prisma";
import type { Lang } from "@/lib/i18n";

export async function findStudentCourseEnrollment(
  studentId: string,
  courseId: string,
  excludeClassId?: string | null,
  subjectId?: string | null,
  teacherId?: string | null
) {
  const classWhere: any = { courseId };
  if (subjectId) classWhere.subjectId = subjectId;
  if (teacherId) classWhere.teacherId = teacherId;

  const where: any = {
    studentId,
    class: classWhere,
  };
  if (excludeClassId) {
    where.NOT = { classId: excludeClassId };
  }
  return prisma.enrollment.findFirst({
    where,
    select: {
      id: true,
      classId: true,
      class: {
        select: {
          id: true,
          capacity: true,
          course: { select: { name: true } },
          subject: { select: { name: true } },
          level: { select: { name: true } },
          teacher: { select: { name: true } },
          campus: { select: { name: true } },
          room: { select: { name: true } },
        },
      },
    },
  });
}

export function formatEnrollmentConflict(conflict: NonNullable<Awaited<ReturnType<typeof findStudentCourseEnrollment>>>) {
  const cls = conflict.class;
  const classLabel = `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
  const roomLabel = cls.room?.name ?? "(none)";
  return `${classLabel} | ${cls.teacher.name} | ${cls.campus.name} / ${roomLabel}`;
}

export function courseEnrollmentConflictMessage(lang: Lang, detail?: string) {
  const en = "Student already has this course/subject enrollment with the same teacher";
  const zh = "学生已存在同老师的该课程/科目报名";
  const base = lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
  return detail ? `${base}: ${detail}` : base;
}
