import { formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

async function tokenIsValid(token: string) {
  const row = await prisma.ticketIntakeToken.findUnique({
    where: { token },
    select: { isActive: true, expiresAt: true },
  });
  return Boolean(row?.isActive && (!row.expiresAt || row.expiresAt.getTime() > Date.now()));
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await tokenIsValid(token))) return bad("Intake link is invalid or expired", 403);
  const studentId = String(new URL(req.url).searchParams.get("studentId") ?? "").trim();
  if (!studentId) return bad("Student is required");
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) return bad("Student not found", 404);

  const sessions = await prisma.session.findMany({
    where: { startAt: { gte: new Date() }, ...sessionBelongsToStudentWhere(studentId) },
    select: {
      id: true,
      startAt: true,
      teacher: { select: { name: true } },
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
    take: 30,
  });

  return Response.json({
    ok: true,
    sessions: sessions.map((session) => ({
      id: session.id,
      startText: formatBusinessDateTime(session.startAt),
      courseLabel: [session.class.course.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / "),
      teacherName: session.teacher?.name ?? session.class.teacher.name,
      locationText: session.class.room?.name ? `${session.class.campus.name} · ${session.class.room.name}` : session.class.campus.name,
    })),
  });
}
