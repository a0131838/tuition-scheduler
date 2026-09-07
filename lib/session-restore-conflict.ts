import type { Prisma } from "@prisma/client";
import { pickStudentSessionConflict, pickTeacherSessionConflict, sessionIncludesStudent } from "./session-conflict";
import { checkTeacherSchedulingAvailability } from "./teacher-scheduling-availability";
import { formatBusinessDateTime } from "./date-only";

export async function assertSessionCanRestore(tx: Prisma.TransactionClient, sessionId: string, studentId: string, bypassAvailability: boolean) {
  const session = await tx.session.findUnique({ where: { id: sessionId }, include: {
    class: { include: { enrollments: { select: { studentId: true } } } }, attendances: true,
  } });
  if (!session || !sessionIncludesStudent(session, studentId)) throw new Error("Lesson does not belong to this student / 课程不属于该学生");
  const teacherId = session.teacherId ?? session.class.teacherId;
  const overlaps = await tx.session.findMany({ where: {
    id: { not: sessionId }, startAt: { lt: session.endAt }, endAt: { gt: session.startAt },
  }, include: { class: { include: { enrollments: { select: { studentId: true } } } }, attendances: true } });
  const conflict = pickStudentSessionConflict(overlaps, studentId)
    ?? pickTeacherSessionConflict(overlaps.filter((row) => (row.teacherId ?? row.class.teacherId) === teacherId))
    ?? (session.class.roomId ? pickTeacherSessionConflict(overlaps.filter((row) => row.class.roomId === session.class.roomId)) : null);
  if (conflict) throw new Error(`Cannot restore: time is occupied / 无法恢复，时段已占用: ${formatBusinessDateTime(conflict.startAt)}; ${conflict.id}`);
  const appointment = await tx.appointment.findFirst({ where: {
    teacherId, startAt: { lt: session.endAt }, endAt: { gt: session.startAt },
  } });
  if (appointment) throw new Error("Cannot restore: teacher has an appointment / 无法恢复，老师已有预约");
  if (!bypassAvailability) {
    const reason = await checkTeacherSchedulingAvailability(tx, teacherId, session.startAt, session.endAt);
    if (reason) throw new Error(reason);
  }
  return session;
}
