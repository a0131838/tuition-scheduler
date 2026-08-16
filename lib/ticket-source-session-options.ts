import { formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";
import { attendanceLocksCancellation, cancellationSourceDateWindow, cancellationSourceStatus } from "@/lib/ticket-cancellation-intake";

export async function getTicketSourceSessionOptions(studentId: string, dateText?: string | null, now = new Date()) {
  const window = cancellationSourceDateWindow(dateText, now);
  if (!window) return null;
  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: window.start, lte: window.end },
      ...sessionBelongsToStudentWhere(studentId),
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      teacher: { select: { name: true } },
      attendances: {
        where: { studentId },
        select: { status: true, deductedMinutes: true, deductedCount: true, packageId: true, excusedCharge: true },
      },
      class: {
        select: {
          course: { select: { name: true } },
          subject: { select: { name: true } },
          level: { select: { name: true } },
          teacher: { select: { name: true } },
          campus: { select: { name: true } },
          room: { select: { name: true } },
        },
      },
    },
    orderBy: { startAt: "asc" },
    take: 100,
  });
  return {
    window: {
      date: window.dateText,
      today: window.today,
      minDate: window.minDate,
      maxDate: window.maxDate,
    },
    sessions: sessions.map((session) => {
      const attendance = session.attendances[0] ?? null;
      const attendanceLocked = attendanceLocksCancellation(attendance);
      const state = cancellationSourceStatus({ startAt: session.startAt, endAt: session.endAt, attendanceLocked }, now);
      return {
        id: session.id,
        startAt: session.startAt.toISOString(),
        endAt: session.endAt.toISOString(),
        startText: formatBusinessDateTime(session.startAt),
        courseLabel: [session.class.course.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / "),
        teacherName: session.teacher?.name ?? session.class.teacher.name,
        locationText: session.class.room?.name ? `${session.class.campus.name} · ${session.class.room.name}` : session.class.campus.name,
        status: state.status,
        statusLabel: state.label,
        canAutoExecute: state.canAutoExecute,
      };
    }),
  };
}
