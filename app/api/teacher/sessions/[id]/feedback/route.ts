import { prisma } from "@/lib/prisma";
import { requireTeacherProfile, getCurrentUser } from "@/lib/auth";
import { FeedbackStatus } from "@prisma/client";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function formatDateTime(value: Date) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { teacher } = await requireTeacherProfile();
  const user = await getCurrentUser();
  if (!teacher || !user) return bad("Teacher profile not linked", 403);

  const { id: sessionId } = await ctx.params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const focusStudentName = String(body?.focusStudentName ?? "").trim() || null;
  const actualStartRaw = String(body?.actualStartAt ?? "").trim();
  const actualEndRaw = String(body?.actualEndAt ?? "").trim();
  const classPerformance = String(body?.classPerformance ?? "").trim();
  const homework = String(body?.homework ?? "").trim();
  const previousHomeworkDoneRaw = String(body?.previousHomeworkDone ?? "").trim();
  const previousHomeworkDone =
    previousHomeworkDoneRaw === "yes" ? true : previousHomeworkDoneRaw === "no" ? false : null;

  if (!classPerformance) return bad("Class performance is required", 409);
  if (!homework) return bad("Homework is required", 409);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: { include: { course: true, subject: true } } },
  });
  if (!session) return bad("Session not found", 404);

  const allowed = session.teacherId === teacher.id || (!session.teacherId && session.class.teacherId === teacher.id);
  if (!allowed) return bad("No permission", 403);

  const deadline = new Date(new Date(session.endAt).getTime() + 12 * 60 * 60 * 1000);
  const now = new Date();
  const status: FeedbackStatus = now <= deadline ? "ON_TIME" : "LATE";

  const actualStartAt = actualStartRaw ? new Date(actualStartRaw) : null;
  const actualEndAt = actualEndRaw ? new Date(actualEndRaw) : null;
  if (actualStartAt && Number.isNaN(actualStartAt.getTime())) return bad("Invalid actual start time", 409);
  if (actualEndAt && Number.isNaN(actualEndAt.getTime())) return bad("Invalid actual end time", 409);
  if (actualStartAt && actualEndAt && actualEndAt <= actualStartAt) return bad("Actual end must be later than start", 409);

  const subjectName = session.class.subject?.name || session.class.course.name;
  const plannedStart = formatDateTime(new Date(session.startAt));
  const plannedEnd = new Date(session.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const actualTimeLine =
    actualStartAt && actualEndAt
      ? `${formatDateTime(actualStartAt)} - ${actualEndAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : actualStartAt
      ? `${formatDateTime(actualStartAt)} - Not set`
      : "Not set";

  const previousHomeworkText =
    previousHomeworkDone === true ? "yes" : previousHomeworkDone === false ? "no" : "not set";
  const feedbackTitle = focusStudentName || "Whole Class";
  const content = [
    `[Class Feedback / 课堂反馈 - ${feedbackTitle}]`,
    `1. Subject / 科目: ${subjectName}`,
    `2. Time / 时间: Planned / 计划 ${plannedStart} - ${plannedEnd}; Actual / 实际 ${actualTimeLine}`,
    `3. Class performance / 课堂表现: ${classPerformance}`,
    `4. Homework / 作业: ${homework}`,
    `5. Previous homework done / 之前作业完成情况: ${previousHomeworkText}`,
  ].join("\n");

  await prisma.sessionFeedback.upsert({
    where: { sessionId_teacherId: { sessionId, teacherId: teacher.id } },
    update: {
      content,
      focusStudentName,
      actualStartAt,
      actualEndAt,
      classPerformance,
      homework,
      previousHomeworkDone,
      status,
      dueAt: deadline,
      submittedByRole: "TEACHER",
      submittedByUserId: user.id,
      isProxyDraft: false,
      proxyNote: null,
      submittedAt: now,
    },
    create: {
      sessionId,
      teacherId: teacher.id,
      content,
      focusStudentName,
      actualStartAt,
      actualEndAt,
      classPerformance,
      homework,
      previousHomeworkDone,
      status,
      dueAt: deadline,
      submittedByRole: "TEACHER",
      submittedByUserId: user.id,
      isProxyDraft: false,
      proxyNote: null,
      submittedAt: now,
    },
  });

  return Response.json({ ok: true, status, submittedAt: now.toISOString() });
}

