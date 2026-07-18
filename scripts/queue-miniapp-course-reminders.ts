import { prisma } from "@/lib/prisma";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import { getVisibleSessionStudents } from "@/lib/session-students";
import { logAudit } from "@/lib/audit-log";

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
  const pendingRows = await prisma.miniappNotificationOutbox.findMany({
    where: { status: "PENDING", templateKey: MINIAPP_TEMPLATE_KEYS.courseReminder24h, targetType: "Session" },
    select: { id: true, studentId: true, targetId: true, payloadJson: true },
    take: 3000,
  });
  const pendingSessionIds = Array.from(new Set(pendingRows.map((row) => {
    const payload = row.payloadJson && typeof row.payloadJson === "object" ? row.payloadJson as any : {};
    return String(payload.sessionId || row.targetId || "").split(":")[0];
  }).filter(Boolean)));
  const currentSessions = await prisma.session.findMany({
    where: { id: { in: pendingSessionIds } },
    select: { id: true, startAt: true, attendances: { select: { studentId: true, status: true } } },
  });
  const currentSessionMap = new Map(currentSessions.map((session) => [session.id, session]));
  let invalidated = 0;
  for (const row of pendingRows) {
    const payload = row.payloadJson && typeof row.payloadJson === "object" ? row.payloadJson as any : {};
    const sessionId = String(payload.sessionId || row.targetId || "").split(":")[0];
    if (!sessionId) continue;
    const current = currentSessionMap.get(sessionId);
    const staleTime = !current || String(payload.startAt || "") !== current.startAt.toISOString();
    const cancelledForStudent = Boolean(current?.attendances.some((attendance) => attendance.studentId === row.studentId && attendance.status === "EXCUSED"));
    if (!staleTime && !cancelledForStudent) continue;
    await prisma.miniappNotificationOutbox.update({ where: { id: row.id }, data: { status: "SKIPPED", error: staleTime ? "Session changed; stale reminder invalidated" : "Student session cancelled; reminder invalidated" } });
    await logAudit({ actor: { email: "system-reminders@sgtmanage.local", name: "Automatic Reminder", role: "SYSTEM" }, module: "NOTIFICATIONS", action: "INVALIDATE_STALE_COURSE_REMINDER", entityType: "MiniappNotificationOutbox", entityId: row.id, meta: { sessionId, staleTime, cancelledForStudent } });
    invalidated += 1;
  }
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
          enrollments: { select: { studentId: true, student: { select: { name: true } } } },
          oneOnOneStudent: { select: { id: true, name: true } },
          campus: { select: { name: true, isOnline: true } },
          room: { select: { name: true } },
        },
      },
      attendances: { select: { studentId: true, status: true } },
      teacher: { select: { name: true } },
      student: { select: { id: true, name: true } },
    },
    orderBy: { startAt: "asc" },
    take: 1000,
  });

  let queued = 0;
  for (const session of sessions) {
    const studentIds = getVisibleSessionStudents(session).map((student) => student.id);
    if (studentIds.length === 0) continue;
    const studentNames = new Map<string, string>();
    if (session.student) studentNames.set(session.student.id, session.student.name);
    if (session.class.oneOnOneStudent) studentNames.set(session.class.oneOnOneStudent.id, session.class.oneOnOneStudent.name);
    session.class.enrollments.forEach((row) => studentNames.set(row.studentId, row.student.name));

    const reminders = [{ hours: 24, key: MINIAPP_TEMPLATE_KEYS.courseReminder24h }];

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
            courseName: session.class.course.name,
            subjectName: session.class.subject?.name || session.class.course.name,
            courseLabel: courseLabel(session),
            teacherName: session.teacher?.name || session.class.teacher.name,
            studentName: studentNames.get(studentId) || "学员",
            durationMinutes: Math.max(1, Math.round((session.endAt.getTime() - session.startAt.getTime()) / 60000)),
            campusName: session.class.campus.name,
            roomName: session.class.room?.name ?? null,
            locationLabel: session.class.campus.isOnline
              ? "线上课程"
              : [session.class.campus.name, session.class.room?.name].filter(Boolean).join(" · "),
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
        invalidatedNotifications: invalidated,
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
