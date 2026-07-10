import { prisma } from "@/lib/prisma";
import { ok, parseDateRange, requireMiniappStudentAccess, sessionDto } from "../../../_lib";

function sessionStudentWhere(studentId: string) {
  return {
    OR: [
      { studentId },
      { class: { oneOnOneStudentId: studentId } },
      { class: { enrollments: { some: { studentId } } } },
    ],
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewSchedule");
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const { from, to } = parseDateRange(url, 30, 60);
  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: from, lte: to },
      ...sessionStudentWhere(studentId),
    },
    include: {
      teacher: true,
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      attendances: { where: { studentId }, take: 1 },
    },
    orderBy: { startAt: "asc" },
    take: 500,
  });

  return ok({
    from: from.toISOString(),
    to: to.toISOString(),
    sessions: sessions.map((session) => sessionDto(session, session.attendances[0])),
  });
}
