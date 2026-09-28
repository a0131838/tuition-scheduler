import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { AttendanceSaveError, saveTeacherAttendance } from "@/lib/teacher-attendance-save";
import { prisma } from "@/lib/prisma";
import { getCancelledSessionStudentIds } from "@/lib/session-students";

async function getAllowedSession(sessionId: string, teacherId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      student: true,
      attendances: true,
      class: {
        include: {
          course: true,
          subject: true,
          enrollments: { include: { student: true }, orderBy: { student: { name: "asc" } } },
        },
      },
    },
  });
  if (!session) return null;
  const allowed = session.teacherId === teacherId || (!session.teacherId && session.class.teacherId === teacherId);
  return allowed ? session : null;
}

function attendanceRows(session: NonNullable<Awaited<ReturnType<typeof getAllowedSession>>>) {
  const cancelledSet = getCancelledSessionStudentIds(session);
  const enrollments =
    session.class.capacity === 1 && session.studentId
      ? session.class.enrollments.filter((e) => e.studentId === session.studentId)
      : session.class.enrollments;
  const attMap = new Map(session.attendances.map((a) => [a.studentId, a]));

  return enrollments
    .filter((e) => !cancelledSet.has(e.studentId))
    .map((e) => {
      const row = attMap.get(e.studentId);
      return {
        studentId: e.studentId,
        studentName: e.student.name,
        status: row?.status ?? "UNMARKED",
        note: row?.note ?? "",
      };
    });
}

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!auth.user.teacherId) return bad("Teacher profile not linked", 403);

  const { sessionId } = await ctx.params;
  const session = await getAllowedSession(sessionId, auth.user.teacherId);
  if (!session) return bad("Session not found or no permission", 404);

  return ok({
    session: {
      id: session.id,
      courseLabel: [session.class.course?.name, session.class.subject?.name].filter(Boolean).join(" / "),
    },
    rows: attendanceRows(session),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!auth.user.teacherId) return bad("Teacher profile not linked", 403);

  const { sessionId } = await ctx.params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  try {
    const result=await saveTeacherAttendance({sessionId,teacherId:auth.user.teacherId,actor:auth.user,action:"MINIAPP_TEACHER_SAVE",items:Array.isArray(body?.items)?body.items:[]});
    const refreshed=await getAllowedSession(sessionId,auth.user.teacherId);
    return ok({...result,rows:refreshed?attendanceRows(refreshed):[]});
  } catch(error) {
    return bad(error instanceof AttendanceSaveError ? error.message : "Attendance was not saved; retry or contact an administrator / 点名未保存，请重试或联系管理员",error instanceof AttendanceSaveError?error.status:500);
  }
}
