import { prisma } from "@/lib/prisma";

async function main() {
  const classes = await prisma.class.findMany({
    where: { capacity: 1 },
    include: { enrollments: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const cls of classes) {
    const studentId = cls.oneOnOneStudentId ?? cls.enrollments[0]?.studentId ?? null;
    if (!studentId || cls.enrollments.length > 1) {
      skipped += 1;
      continue;
    }

    let group = await prisma.oneOnOneGroup.findFirst({
      where: {
        teacherId: cls.teacherId,
        courseId: cls.courseId,
        subjectId: cls.subjectId,
        levelId: cls.levelId,
        campusId: cls.campusId,
        roomId: cls.roomId,
      },
    });
    if (!group) {
      group = await prisma.oneOnOneGroup.create({
        data: {
          teacherId: cls.teacherId,
          courseId: cls.courseId,
          subjectId: cls.subjectId,
          levelId: cls.levelId,
          campusId: cls.campusId,
          roomId: cls.roomId,
        },
      });
    }

    await prisma.class.update({
      where: { id: cls.id },
      data: {
        oneOnOneGroupId: group.id,
        oneOnOneStudentId: studentId,
      },
    });

    updated += 1;
  }

  console.log(`Backfill done. Updated: ${updated}, skipped: ${skipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
