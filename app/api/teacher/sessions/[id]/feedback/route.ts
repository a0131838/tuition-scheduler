import { prisma } from "@/lib/prisma";
import { requireTeacherProfile, getCurrentUser } from "@/lib/auth";
import { FeedbackStatus } from "@prisma/client";
import { formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";
import {
  FEEDBACK_WINDOW_HOURS,
  getFeedbackDueAt,
  getFeedbackSubmissionStatus,
} from "@/lib/feedback-timing";
import {
  buildParentFeedbackText,
  getMissingParentFeedbackSectionLabels,
  parseParentFeedbackSections,
} from "@/lib/parent-feedback-format";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function formatDateTime(value: Date) {
  return formatBusinessDateTime(value);
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
  const parentFeedbackSections =
    body?.parentFeedbackSections && typeof body.parentFeedbackSections === "object"
      ? parseParentFeedbackSections(buildParentFeedbackText(body.parentFeedbackSections))
      : parseParentFeedbackSections(String(body?.classPerformance ?? "").trim());
  const classPerformance = buildParentFeedbackText(parentFeedbackSections);
  const homework = String(body?.homework ?? "").trim();
  const previousHomeworkDoneRaw = String(body?.previousHomeworkDone ?? "").trim();
  const previousHomeworkDone =
    previousHomeworkDoneRaw === "yes" ? true : previousHomeworkDoneRaw === "no" ? false : null;

  const missingParentSections = getMissingParentFeedbackSectionLabels(parentFeedbackSections);
  if (!classPerformance || missingParentSections.length > 0) {
    return bad(`Parent-facing feedback must complete: ${missingParentSections.join(", ")}`, 409, {
      missingParentSections,
    });
  }
  if (!homework) return bad("Homework is required", 409);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: { include: { course: true, subject: true } } },
  });
  if (!session) return bad("Session not found", 404);

  const allowed = session.teacherId === teacher.id || (!session.teacherId && session.class.teacherId === teacher.id);
  if (!allowed) return bad("No permission", 403);

  const now = new Date();
  const deadline = getFeedbackDueAt(session.endAt);
  const status: FeedbackStatus = getFeedbackSubmissionStatus(session.endAt, now);

  const actualStartAt = actualStartRaw ? new Date(actualStartRaw) : null;
  const actualEndAt = actualEndRaw ? new Date(actualEndRaw) : null;
  if (actualStartAt && Number.isNaN(actualStartAt.getTime())) return bad("Invalid actual start time", 409);
  if (actualEndAt && Number.isNaN(actualEndAt.getTime())) return bad("Invalid actual end time", 409);
  if (actualStartAt && actualEndAt && actualEndAt <= actualStartAt) return bad("Actual end must be later than start", 409);

  const subjectName = session.class.subject?.name || session.class.course.name;
  const plannedStart = formatDateTime(new Date(session.startAt));
  const plannedEnd = formatBusinessTimeOnly(new Date(session.endAt));
  const actualTimeLine =
    actualStartAt && actualEndAt
      ? `${formatDateTime(actualStartAt)} - ${formatBusinessTimeOnly(actualEndAt)}`
      : actualStartAt
      ? `${formatDateTime(actualStartAt)} - Not set`
      : "Not set";

  const previousHomeworkText =
    previousHomeworkDone === true ? "yes" : previousHomeworkDone === false ? "no" : "not set";
  const feedbackTitle = focusStudentName || "Whole Class";
  const content = [
    `[Parent-facing Feedback / 家长视角课后反馈 - ${feedbackTitle}]`,
    `1. Subject / 科目: ${subjectName}`,
    `2. Time / 时间: Planned / 计划 ${plannedStart} - ${plannedEnd}; Actual / 实际 ${actualTimeLine}`,
    "",
    classPerformance,
    "",
    `课后作业 / Homework: ${homework}`,
    `Previous homework done / 之前作业完成情况: ${previousHomeworkText}`,
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

  return Response.json({
    ok: true,
    status,
    submittedAt: now.toISOString(),
    dueAt: deadline.toISOString(),
    dueAtText: formatBusinessDateTime(deadline),
    windowHours: FEEDBACK_WINDOW_HOURS,
  });
}
