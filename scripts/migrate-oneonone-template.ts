import { prisma } from "@/lib/prisma";

type GroupKey = {
  teacherId: string;
  courseId: string;
  subjectId: string | null;
  levelId: string | null;
  campusId: string;
  roomId: string | null;
};

function keyOf(k: GroupKey) {
  return [
    k.teacherId,
    k.courseId,
    k.subjectId ?? "",
    k.levelId ?? "",
    k.campusId,
    k.roomId ?? "",
  ].join("|");
}

async function getOrCreateGroup(k: GroupKey) {
  let group = await prisma.oneOnOneGroup.findFirst({
    where: {
      teacherId: k.teacherId,
      courseId: k.courseId,
      subjectId: k.subjectId,
      levelId: k.levelId,
      campusId: k.campusId,
      roomId: k.roomId,
    },
  });
  if (!group) {
    group = await prisma.oneOnOneGroup.create({
      data: {
        teacherId: k.teacherId,
        courseId: k.courseId,
        subjectId: k.subjectId,
        levelId: k.levelId,
        campusId: k.campusId,
        roomId: k.roomId,
      },
    });
  }
  return group;
}

async function getOrCreateTemplateClass(k: GroupKey, groupId: string) {
  let cls = await prisma.class.findFirst({
    where: {
      oneOnOneGroupId: groupId,
      capacity: 1,
      oneOnOneStudentId: null,
    },
  });
  if (!cls) {
    cls = await prisma.class.create({
      data: {
        teacherId: k.teacherId,
        courseId: k.courseId,
        subjectId: k.subjectId,
        levelId: k.levelId,
        campusId: k.campusId,
        roomId: k.roomId,
        capacity: 1,
        oneOnOneGroupId: groupId,
        oneOnOneStudentId: null,
      },
    });
  } else if (cls.oneOnOneGroupId !== groupId) {
    cls = await prisma.class.update({
      where: { id: cls.id },
      data: { oneOnOneGroupId: groupId },
    });
  }
  return cls;
}

async function main() {
  const oneOnOneClasses = await prisma.class.findMany({
    where: { capacity: 1 },
    include: {
      enrollments: true,
      sessions: true,
    },
  });

  const classToTemplate = new Map<string, string>();
  let movedSessions = 0;
  let unmappedSessions = 0;
  let deletedClasses = 0;

  for (const cls of oneOnOneClasses) {
    const key: GroupKey = {
      teacherId: cls.teacherId,
      courseId: cls.courseId,
      subjectId: cls.subjectId ?? null,
      levelId: cls.levelId ?? null,
      campusId: cls.campusId,
      roomId: cls.roomId ?? null,
    };
    const group = await getOrCreateGroup(key);
    const templateClass = await getOrCreateTemplateClass(key, group.id);
    classToTemplate.set(cls.id, templateClass.id);

    const studentIds = [
      ...(cls.oneOnOneStudentId ? [cls.oneOnOneStudentId] : []),
      ...cls.enrollments.map((e) => e.studentId),
    ];
    const uniqueStudents = Array.from(new Set(studentIds));

    for (const studentId of uniqueStudents) {
      await prisma.enrollment.upsert({
        where: { classId_studentId: { classId: templateClass.id, studentId } },
        update: {},
        create: { classId: templateClass.id, studentId },
      });
    }

    const sessions = await prisma.session.findMany({
      where: { classId: cls.id },
      include: { attendances: true },
    });

    for (const s of sessions) {
      let targetStudentId: string | null = null;
      if (uniqueStudents.length === 1) {
        targetStudentId = uniqueStudents[0]!;
      } else {
        const attendanceStudents = Array.from(new Set(s.attendances.map((a) => a.studentId)));
        if (attendanceStudents.length === 1) {
          targetStudentId = attendanceStudents[0]!;
        }
      }

      await prisma.session.update({
        where: { id: s.id },
        data: {
          classId: templateClass.id,
          studentId: targetStudentId,
        },
      });

      if (targetStudentId) movedSessions += 1;
      else unmappedSessions += 1;
    }
  }

  const templates = await prisma.teacherOneOnOneTemplate.findMany({
    select: { id: true, classId: true },
  });
  for (const tpl of templates) {
    const newClassId = classToTemplate.get(tpl.classId);
    if (newClassId && newClassId !== tpl.classId) {
      await prisma.teacherOneOnOneTemplate.update({
        where: { id: tpl.id },
        data: { classId: newClassId },
      });
    }
  }

  for (const cls of oneOnOneClasses) {
    const templateId = classToTemplate.get(cls.id);
    if (templateId && templateId !== cls.id) {
      await prisma.enrollment.deleteMany({ where: { classId: cls.id } });
      await prisma.class.delete({ where: { id: cls.id } });
      deletedClasses += 1;
    }
  }

  console.log(
    `Migration done. Moved sessions: ${movedSessions}, unmapped sessions: ${unmappedSessions}, deleted classes: ${deletedClasses}`
  );
  if (unmappedSessions > 0) {
    console.log("Note: some sessions could not be mapped to a single student. Please assign in class sessions page.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
