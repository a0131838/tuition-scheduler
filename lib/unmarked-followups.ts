import { prisma } from "@/lib/prisma";
import { getVisibleSessionStudents } from "@/lib/session-students";

type SessionRow = {
  id: string;
  startAt: Date;
  endAt: Date;
  teacherId: string | null;
  teacher: { id: string; name: string } | null;
  studentId: string | null;
  student: { id: string; name: string } | null;
  attendances: Array<{ studentId: string; status: string }>;
  class: {
    id: string;
    capacity: number;
    teacherId: string;
    teacher: { id: string; name: string };
    course: { name: string };
    subject: { name: string } | null;
    level: { name: string } | null;
    campus: { name: string };
    room: { name: string } | null;
    oneOnOneStudentId: string | null;
    oneOnOneStudent: { id: string; name: string } | null;
    enrollments: Array<{ studentId: string; student: { id: string; name: string } | null }>;
  };
};

export type OverdueUnmarkedItem = {
  id: string;
  teacherName: string;
  courseLabel: string;
  studentNames: string[];
  unmarkedCount: number;
  startAt: string;
  endAt: string;
  overdueMinutes: number;
  overdueLabel: string;
  attendanceHref: string;
};

export type OverdueUnmarkedGroup = {
  teacherId: string;
  teacherName: string;
  count: number;
  maxOverdueMinutes: number;
  items: OverdueUnmarkedItem[];
};

function overdueLabel(overdueMinutes: number) {
  if (overdueMinutes < 60) return `${overdueMinutes} min overdue`;
  const hours = Math.floor(overdueMinutes / 60);
  const minutes = overdueMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m overdue` : `${hours}h overdue`;
}

function courseLabel(session: SessionRow) {
  return [
    session.class.course.name,
    session.class.subject?.name ?? null,
    session.class.level?.name ?? null,
  ]
    .filter(Boolean)
    .join(" / ");
}

function calcUnmarkedCount(session: SessionRow) {
  const expectedStudents = getVisibleSessionStudents(session);
  if (!expectedStudents.length) return { unmarkedCount: 0, studentNames: [] as string[] };
  const expectedIds = new Set(expectedStudents.map((row) => row.id));
  const rows = session.attendances.filter((row) => expectedIds.has(row.studentId));
  const markedIds = new Set(rows.map((row) => row.studentId));
  const unmarkedRows = rows.filter((row) => row.status === "UNMARKED").length;
  let missingRows = 0;
  for (const sid of expectedIds) {
    if (!markedIds.has(sid)) missingRows += 1;
  }
  return {
    unmarkedCount: unmarkedRows + missingRows,
    studentNames: expectedStudents.map((row) => row.name ?? "-"),
  };
}

export async function getOverdueUnmarkedFollowupGroups(options?: {
  now?: Date;
  thresholdHours?: number;
  lookbackDays?: number;
  perTeacherLimit?: number;
  totalLimit?: number;
}) {
  const now = options?.now ?? new Date();
  const thresholdHours = Math.max(1, Math.min(options?.thresholdHours ?? 3, 24));
  const lookbackDays = Math.max(1, Math.min(options?.lookbackDays ?? 7, 30));
  const perTeacherLimit = Math.max(1, Math.min(options?.perTeacherLimit ?? 5, 20));
  const totalLimit = Math.max(1, Math.min(options?.totalLimit ?? 80, 300));
  const thresholdAt = new Date(now.getTime() - thresholdHours * 60 * 60 * 1000);
  const lookbackAt = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const sessions = (await prisma.session.findMany({
    where: {
      endAt: { gte: lookbackAt, lt: thresholdAt },
    },
    include: {
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
      attendances: { select: { studentId: true, status: true } },
      class: {
        include: {
          teacher: { select: { id: true, name: true } },
          course: { select: { name: true } },
          subject: { select: { name: true } },
          level: { select: { name: true } },
          campus: { select: { name: true } },
          room: { select: { name: true } },
          oneOnOneStudent: { select: { id: true, name: true } },
          enrollments: { include: { student: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: [{ endAt: "asc" }],
    take: totalLimit,
  })) as SessionRow[];

  const groupMap = new Map<string, OverdueUnmarkedItem[]>();
  const teacherNameMap = new Map<string, string>();

  for (const session of sessions) {
    const { unmarkedCount, studentNames } = calcUnmarkedCount(session);
    if (unmarkedCount <= 0) continue;
    const teacherId = session.teacherId ?? session.class.teacherId;
    const teacherName = session.teacher?.name ?? session.class.teacher.name;
    const overdueMinutes = Math.max(0, Math.floor((now.getTime() - session.endAt.getTime()) / 60000));
    const item: OverdueUnmarkedItem = {
      id: session.id,
      teacherName,
      courseLabel: courseLabel(session),
      studentNames,
      unmarkedCount,
      startAt: session.startAt.toISOString(),
      endAt: session.endAt.toISOString(),
      overdueMinutes,
      overdueLabel: overdueLabel(overdueMinutes),
      attendanceHref: `/admin/sessions/${session.id}/attendance`,
    };
    const bucket = groupMap.get(teacherId) ?? [];
    bucket.push(item);
    groupMap.set(teacherId, bucket);
    teacherNameMap.set(teacherId, teacherName);
  }

  return Array.from(groupMap.entries())
    .map(([teacherId, items]) => {
      const sorted = items
        .sort((a, b) => b.overdueMinutes - a.overdueMinutes)
        .slice(0, perTeacherLimit);
      return {
        teacherId,
        teacherName: teacherNameMap.get(teacherId) ?? teacherId,
        count: items.length,
        maxOverdueMinutes: Math.max(...items.map((item) => item.overdueMinutes), 0),
        items: sorted,
      };
    })
    .sort((a, b) => {
      if (b.maxOverdueMinutes !== a.maxOverdueMinutes) return b.maxOverdueMinutes - a.maxOverdueMinutes;
      return b.count - a.count;
    });
}
