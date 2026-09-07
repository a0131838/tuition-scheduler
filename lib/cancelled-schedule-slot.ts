import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;
type CancelledLesson = {
  studentId: string | null;
  class: { capacity: number; oneOnOneStudentId: string | null };
  attendances: Array<{ studentId: string; status: string; excusedCharge: boolean; deductedMinutes: number; deductedCount: number }>;
};

// A cancellation with financial effects must use the existing finance-aware flow.
export function canReuseCancelledSlot(session: CancelledLesson) {
  const owner = session.studentId ?? session.class.oneOnOneStudentId;
  if (session.class.capacity !== 1 || !owner || session.attendances.length !== 1) return false;
  const rows = session.attendances.filter((row) => row.studentId === owner);
  return rows.length === 1 && rows[0].status === "EXCUSED" && !rows[0].excusedCharge
    && rows[0].deductedMinutes === 0 && rows[0].deductedCount === 0;
}

export async function findSlotCollision(db: Db, classId: string, startAt: Date, endAt: Date) {
  return db.session.findFirst({
    where: { classId, startAt, endAt },
    include: { class: true, attendances: true },
  });
}

export async function createInReleasedSlot(db: Prisma.TransactionClient, input: {
  classId: string; studentId: string; teacherId: string; startAt: Date; endAt: Date;
}) {
  const collision = await findSlotCollision(db, input.classId, input.startAt, input.endAt);
  let classId = input.classId;
  if (collision) {
    if (!canReuseCancelledSlot(collision)) throw new Error("Session already exists at this time");
    if ((collision.studentId ?? collision.class.oneOnOneStudentId) === input.studentId) {
      throw new Error("This lesson is cancelled. Restore the original lesson / 请恢复原来已取消的课程");
    }
    // Keep the original session ID, attendance, and audit references untouched.
    // A separate 1:1 container avoids the legacy class/time unique constraint.
    const c = collision.class;
    const replacementClass = await db.class.create({ data: {
      courseId: c.courseId, subjectId: c.subjectId, levelId: c.levelId,
      teacherId: input.teacherId, campusId: c.campusId, roomId: c.roomId,
      capacity: 1, oneOnOneGroupId: c.oneOnOneGroupId, oneOnOneStudentId: input.studentId,
      enrollments: { create: { studentId: input.studentId } },
    } });
    classId = replacementClass.id;
  }
  return db.session.create({ data: { ...input, classId } });
}
