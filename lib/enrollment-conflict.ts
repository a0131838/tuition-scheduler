import { prisma } from "@/lib/prisma";
import type { Lang } from "@/lib/i18n";

export async function findStudentCourseEnrollment(
  studentId: string,
  courseId: string,
  excludeClassId?: string | null
) {
  const where: any = {
    studentId,
    class: { courseId },
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
  const en = "Student already has this course enrollment";
  const zh = "学生已存在该课程报名";
  const base = lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
  return detail ? `${base}: ${detail}` : base;
}
