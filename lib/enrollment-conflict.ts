import { prisma } from "@/lib/prisma";
import type { Lang } from "@/lib/i18n";

export type EnrollmentTeachingMode = "ONE_ON_ONE" | "GROUP";

export function classTeachingMode(capacity: number | null | undefined): EnrollmentTeachingMode {
  return capacity === 1 ? "ONE_ON_ONE" : "GROUP";
}

export async function findStudentCourseEnrollment(
  studentId: string,
  courseId: string,
  excludeClassId?: string | null,
  subjectId?: string | null,
  teacherId?: string | null,
  teachingMode?: EnrollmentTeachingMode | null
) {
  const classWhere: any = { courseId };
  if (subjectId) classWhere.subjectId = subjectId;
  if (teacherId) classWhere.teacherId = teacherId;
  if (teachingMode === "ONE_ON_ONE") classWhere.capacity = 1;
  if (teachingMode === "GROUP") classWhere.capacity = { gt: 1 };

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
  const modeLabel = classTeachingMode(cls.capacity) === "ONE_ON_ONE" ? "1-on-1" : "Group";
  return `${classLabel} | ${cls.teacher.name} | ${modeLabel} | ${cls.campus.name} / ${roomLabel}`;
}

export function courseEnrollmentConflictMessage(lang: Lang, detail?: string) {
  const en = "Student already has this course/subject enrollment with the same teacher and teaching mode";
  const zh = "学生已存在同老师、同课程/科目、同班型的报名";
  const base = lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
  return detail ? `${base}: ${detail}` : base;
}
