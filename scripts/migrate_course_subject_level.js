/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({ orderBy: { name: "asc" } });
  if (courses.length === 0) {
    console.log("No courses found. Nothing to migrate.");
    return;
  }

  const courseToSubject = new Map();
  const courseToLevel = new Map();

  for (const course of courses) {
    const subjectName = "General";
    const levelName = (course.level || "").trim() || "Default";

    let subject = await prisma.subject.findFirst({
      where: { courseId: course.id, name: subjectName },
    });
    if (!subject) {
      subject = await prisma.subject.create({
        data: { courseId: course.id, name: subjectName },
      });
    }

    let level = await prisma.level.findFirst({
      where: { subjectId: subject.id, name: levelName },
    });
    if (!level) {
      level = await prisma.level.create({
        data: { subjectId: subject.id, name: levelName },
      });
    }

    courseToSubject.set(course.id, subject.id);
    courseToLevel.set(course.id, level.id);

    await prisma.class.updateMany({
      where: {
        courseId: course.id,
        OR: [{ subjectId: null }, { levelId: null }],
      },
      data: {
        subjectId: subject.id,
        levelId: level.id,
      },
    });

    await prisma.teacher.updateMany({
      where: { subjectCourseId: course.id },
      data: { subjectCourseId: subject.id },
    });
  }

  try {
    const rows = await prisma.$queryRaw`SELECT "A", "B" FROM "_TeacherSubjects"`;
    const teacherToSubjects = new Map();

    for (const row of rows) {
      const courseId = row.A;
      const teacherId = row.B;
      const subjectId = courseToSubject.get(courseId);
      if (!subjectId) continue;
      if (!teacherToSubjects.has(teacherId)) teacherToSubjects.set(teacherId, new Set());
      teacherToSubjects.get(teacherId).add(subjectId);
    }

    for (const [teacherId, subjectSet] of teacherToSubjects.entries()) {
      const subjectIds = Array.from(subjectSet);
      if (subjectIds.length === 0) continue;

      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        include: { subjects: true },
      });
      if (!teacher) continue;

      const merged = new Set(teacher.subjects.map((s) => s.id));
      for (const sid of subjectIds) merged.add(sid);

      await prisma.teacher.update({
        where: { id: teacherId },
        data: { subjects: { set: Array.from(merged).map((id) => ({ id })) } },
      });
    }
  } catch (err) {
    console.warn("Skipping _TeacherSubjects migration (table missing or already migrated).", err?.message ?? err);
  }

  console.log("Migration finished.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

