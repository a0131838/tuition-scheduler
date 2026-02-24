import { prisma } from "@/lib/prisma";
import { findStudentCourseEnrollment } from "@/lib/enrollment-conflict";

type OneOnOneClassInput = {
  teacherId: string;
  studentId: string;
  courseId?: string;
  subjectId?: string | null;
  levelId?: string | null;
  campusId: string;
  roomId?: string | null;
  ensureEnrollment?: boolean;
};

export async function getOrCreateOneOnOneGroup(input: {
  teacherId: string;
  courseId: string;
  subjectId?: string | null;
  levelId?: string | null;
  campusId: string;
  roomId?: string | null;
}) {
  const { teacherId, courseId, subjectId = null, levelId = null, campusId, roomId = null } = input;
  const existing = await prisma.oneOnOneGroup.findFirst({
    where: {
      teacherId,
      courseId,
      subjectId,
      levelId,
      campusId,
      roomId,
    },
  });
  if (existing) return existing;
  return prisma.oneOnOneGroup.create({
    data: {
      teacherId,
      courseId,
      subjectId,
      levelId,
      campusId,
      roomId,
    },
  });
}

export async function getOrCreateOneOnOneClassForStudent(input: OneOnOneClassInput) {
  const {
    teacherId,
    studentId,
    subjectId = null,
    levelId = null,
    campusId,
    roomId = null,
    ensureEnrollment = false,
  } = input;

  let courseId = input.courseId ?? null;
  if (!courseId) {
    if (levelId) {
      const level = await prisma.level.findUnique({
        where: { id: levelId },
        include: { subject: true },
      });
      if (!level) return null;
      if (subjectId && level.subjectId !== subjectId) return null;
      courseId = level.subject.courseId;
    } else if (subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { courseId: true },
      });
      if (!subject) return null;
      courseId = subject.courseId;
    } else {
      return null;
    }
  }

  if (ensureEnrollment) {
    const existingEnrollment =
      subjectId != null
        ? await prisma.enrollment.findFirst({
            where: {
              studentId,
              class: { courseId, subjectId },
            },
            select: { classId: true },
          })
        : await findStudentCourseEnrollment(studentId, courseId);
    if (existingEnrollment) {
        const existingClass = await prisma.class.findUnique({
        where: { id: existingEnrollment.classId },
      });
      if (existingClass) {
        const subjectMismatch = subjectId != null && existingClass.subjectId !== subjectId;
        // Keep strict subject consistency, but allow level differences for existing 1-on-1 enrollments.
        if (existingClass.capacity !== 1 || subjectMismatch) {
          throw new Error("COURSE_ENROLLMENT_CONFLICT");
        }
        return existingClass;
      }
    }
  }

  const group = await getOrCreateOneOnOneGroup({
    teacherId,
    courseId,
    subjectId,
    levelId,
    campusId,
    roomId,
  });

  let cls = await prisma.class.findFirst({
    where: {
      oneOnOneGroupId: group.id,
      capacity: 1,
      oneOnOneStudentId: null,
    },
  });

  if (!cls) {
    cls = await prisma.class.create({
      data: {
        teacherId,
        courseId,
        subjectId,
        levelId,
        campusId,
        roomId,
        capacity: 1,
        oneOnOneGroupId: group.id,
        oneOnOneStudentId: null,
      },
    });
  }

  if (ensureEnrollment) {
    await prisma.enrollment.upsert({
      where: { classId_studentId: { classId: cls.id, studentId } },
      update: {},
      create: { classId: cls.id, studentId },
    });
  }

  return cls;
}
