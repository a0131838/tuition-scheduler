import { prisma } from "@/lib/prisma";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";

function addHours(d: Date, hours: number) {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

function courseLabel(session: {
  class: {
    course: { name: string };
    subject: { name: string } | null;
    level: { name: string } | null;
  };
}) {
  return [session.class.course.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / ");
}

async function main() {
  const now = new Date();
  const windowEnd = addHours(now, 30);
  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: now, lte: windowEnd },
    },
    include: {
      class: {
        include: {
          course: true,
          subject: true,
          level: true,
          teacher: { select: { name: true } },
          enrollments: { select: { studentId: true } },
          oneOnOneStudent: { select: { id: true } },
          campus: { select: { name: true, isOnline: true } },
          room: { select: { name: true } },
        },
      },
      teacher: { select: { name: true } },
      student: { select: { id: true } },
    },
    orderBy: { startAt: "asc" },
    take: 1000,
  });

  let queued = 0;
  for (const session of sessions) {
    const studentIds = Array.from(
      new Set([
        session.studentId,
        session.student?.id,
        session.class.oneOnOneStudent?.id,
        ...session.class.enrollments.map((row) => row.studentId),
      ].filter((id): id is string => Boolean(id)))
    );
    if (studentIds.length === 0) continue;

    const reminders = [
      { hours: 24, key: MINIAPP_TEMPLATE_KEYS.courseReminder24h },
      { hours: 6, key: MINIAPP_TEMPLATE_KEYS.courseReminder6h },
    ];

    for (const reminder of reminders) {
      const scheduledAt = new Date(session.startAt.getTime() - reminder.hours * 60 * 60 * 1000);
      if (scheduledAt < addHours(now, -1)) continue;
      for (const studentId of studentIds) {
        const results = await queueMiniappNotificationsForStudent({
          studentId,
          templateKey: reminder.key,
          eventType: "COURSE_REMINDER",
          targetType: "Session",
          targetId: `${session.id}:${reminder.hours}h`,
          permission: "canViewSchedule",
          scheduledAt,
          payload: {
            sessionId: session.id,
            reminderHours: reminder.hours,
            startAt: session.startAt.toISOString(),
            endAt: session.endAt.toISOString(),
            courseLabel: courseLabel(session),
            teacherName: session.teacher?.name || session.class.teacher.name,
            campusName: session.class.campus.name,
            roomName: session.class.room?.name ?? null,
            mode: session.class.campus.isOnline ? "ONLINE" : "OFFLINE",
          },
        });
        queued += results.filter(Boolean).length;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        scannedSessions: sessions.length,
        queuedNotifications: queued,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
