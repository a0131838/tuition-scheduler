import { Prisma } from "@prisma/client";
import { formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { getVisibleSessionStudents } from "@/lib/session-students";

const sessionInclude = Prisma.validator<Prisma.SessionInclude>()({
  attendances: { select: { studentId: true, status: true } },
  student: { include: { sourceChannel: true } },
  teacher: { select: { id: true, name: true } },
  class: {
    include: {
      course: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
      campus: { select: { id: true, name: true, isOnline: true } },
      room: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      oneOnOneStudent: { include: { sourceChannel: true } },
      enrollments: {
        include: { student: { include: { sourceChannel: true } } },
        orderBy: { student: { name: "asc" } },
      },
    },
  },
});

export type MiniappStaffSessionContext = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;

type StaffUser = {
  role: string;
  teacherId: string | null;
  workspaceAccesses?: Array<{ workspace: string }>;
};

export async function getMiniappStaffSessionContext(sessionId: string) {
  return prisma.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
}

export function canTeachMiniappSession(user: StaffUser, session: MiniappStaffSessionContext) {
  if (!user.teacherId) return false;
  const effectiveTeacherId = session.teacherId ?? session.class.teacherId;
  return effectiveTeacherId === user.teacherId;
}

export function canAccessMiniappStaffSession(user: StaffUser, session: MiniappStaffSessionContext) {
  if (user.role !== "TEACHER") return true;
  return canTeachMiniappSession(user, session);
}

export function canManageMiniappSchedulingCoordination(user: StaffUser) {
  if (user.role === "ADMIN" || user.role === "CS") return true;
  return (user.workspaceAccesses ?? []).some((row) => row.workspace === "CS");
}

export function miniappStaffSessionCourseLabel(session: MiniappStaffSessionContext) {
  return [session.class.course?.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / ") || "-";
}

export function miniappStaffSessionStudents(session: MiniappStaffSessionContext) {
  const detailById = new Map<
    string,
    { id: string; name: string; grade: string | null; sourceChannel: { name: string } | null }
  >();
  const candidates = [
    session.student,
    session.class.oneOnOneStudent,
    ...session.class.enrollments.map((row) => row.student),
  ].filter(Boolean);

  for (const student of candidates) {
    if (!student) continue;
    detailById.set(student.id, {
      id: student.id,
      name: student.name,
      grade: student.grade,
      sourceChannel: student.sourceChannel ? { name: student.sourceChannel.name } : null,
    });
  }

  return getVisibleSessionStudents(session)
    .map((row) => detailById.get(row.id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

export function miniappStaffSessionDto(session: MiniappStaffSessionContext) {
  const teacher = session.teacher ?? session.class.teacher;
  const campus = session.class.campus;
  const roomName = session.class.room?.name ?? null;
  const students = miniappStaffSessionStudents(session);
  return {
    id: session.id,
    classId: session.classId,
    courseLabel: miniappStaffSessionCourseLabel(session),
    startAt: session.startAt.toISOString(),
    endAt: session.endAt.toISOString(),
    startText: formatBusinessDateTime(session.startAt),
    endText: formatBusinessDateTime(session.endAt),
    teacherId: teacher.id,
    teacherName: teacher.name,
    campusName: campus.name,
    campusLabel: campus.isOnline ? "线上" : campus.name,
    roomName,
    locationText: roomName ? `${campus.name} · ${roomName}` : campus.name,
    students: students.map((student) => ({ id: student.id, name: student.name })),
    studentText: students.map((student) => student.name).join("、") || "-",
  };
}
