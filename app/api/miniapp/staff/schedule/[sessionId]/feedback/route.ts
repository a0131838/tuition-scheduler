import { FeedbackStatus } from "@prisma/client";
import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";
import { FEEDBACK_WINDOW_HOURS, getFeedbackDueAt, getFeedbackSubmissionStatus } from "@/lib/feedback-timing";
import {
  buildParentFeedbackText,
  getMissingParentFeedbackSectionLabels,
  parseParentFeedbackSections,
} from "@/lib/parent-feedback-format";
import { prisma } from "@/lib/prisma";
import { ensureFeedbackCommunicationTasks } from "@/lib/parent-communication-center";

function previousHomeworkValue(value: boolean | null | undefined) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

async function getAllowedSession(sessionId: string, teacherId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      class: { include: { course: true, subject: true, teacher: true } },
      teacher: true,
      feedbacks: { where: { teacherId } },
    },
  });
  if (!session) return null;
  const allowed = session.teacherId === teacherId || (!session.teacherId && session.class.teacherId === teacherId);
  return allowed ? session : null;
}

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!auth.user.teacherId) return bad("Teacher profile not linked", 403);

  const { sessionId } = await ctx.params;
  const session = await getAllowedSession(sessionId, auth.user.teacherId);
  if (!session) return bad("Session not found or no permission", 404);

  const feedback = session.feedbacks[0] ?? null;
  return ok({
    session: {
      id: session.id,
      courseLabel: [session.class.course?.name, session.class.subject?.name].filter(Boolean).join(" / "),
      startText: formatBusinessDateTime(session.startAt),
      endText: formatBusinessDateTime(session.endAt),
      teacherName: session.teacher?.name ?? session.class.teacher?.name ?? auth.user.name,
    },
    feedback: {
      focusStudentName: feedback?.focusStudentName ?? "",
      parentFeedbackSections: parseParentFeedbackSections(feedback?.classPerformance ?? ""),
      homework: feedback?.homework ?? "",
      previousHomeworkDone: previousHomeworkValue(feedback?.previousHomeworkDone),
      status: feedback?.status ?? null,
      submittedAt: feedback?.submittedAt?.toISOString() ?? null,
      reviewStatus: feedback?.reviewStatus ?? null,
      reviewNote: feedback?.reviewNote ?? null,
      publishedAt: feedback?.publishedAt?.toISOString() ?? null,
    },
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

  const session = await getAllowedSession(sessionId, auth.user.teacherId);
  if (!session) return bad("Session not found or no permission", 404);

  const focusStudentName = String(body?.focusStudentName ?? "").trim() || null;
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
  if (missingParentSections.length > 0) {
    return bad(`Parent-facing feedback must complete: ${missingParentSections.join(", ")}`, 409, {
      missingParentSections,
    });
  }
  if (!homework) return bad("Homework is required", 409);

  const now = new Date();
  const deadline = getFeedbackDueAt(session.endAt);
  const status: FeedbackStatus = getFeedbackSubmissionStatus(session.endAt, now);
  const subjectName = session.class.subject?.name || session.class.course.name;
  const plannedStart = formatBusinessDateTime(session.startAt);
  const plannedEnd = formatBusinessTimeOnly(session.endAt);
  const previousHomeworkText =
    previousHomeworkDone === true ? "yes" : previousHomeworkDone === false ? "no" : "not set";
  const feedbackTitle = focusStudentName || "Whole Class";
  const content = [
    `[Parent-facing Feedback / 家长视角课后反馈 - ${feedbackTitle}]`,
    `1. Subject / 科目: ${subjectName}`,
    `2. Time / 时间: Planned / 计划 ${plannedStart} - ${plannedEnd}; Actual / 实际 Not set`,
    "",
    classPerformance,
    "",
    `课后作业 / Homework: ${homework}`,
    `Previous homework done / 之前作业完成情况: ${previousHomeworkText}`,
  ].join("\n");

  const savedFeedback = await prisma.sessionFeedback.upsert({
    where: { sessionId_teacherId: { sessionId, teacherId: auth.user.teacherId } },
    update: {
      content,
      focusStudentName,
      classPerformance,
      homework,
      previousHomeworkDone,
      status,
      dueAt: deadline,
      submittedByRole: "TEACHER",
      submittedByUserId: auth.user.id,
      isProxyDraft: false,
      proxyNote: null,
      submittedAt: now,
      reviewStatus: "PENDING_REVIEW",
      reviewNote: null,
    },
    create: {
      sessionId,
      teacherId: auth.user.teacherId,
      content,
      focusStudentName,
      classPerformance,
      homework,
      previousHomeworkDone,
      status,
      dueAt: deadline,
      submittedByRole: "TEACHER",
      submittedByUserId: auth.user.id,
      isProxyDraft: false,
      proxyNote: null,
      submittedAt: now,
      reviewStatus: "PENDING_REVIEW",
    },
  });
  await ensureFeedbackCommunicationTasks(savedFeedback.id).catch(() => null);

  return ok({
    status,
    submittedAt: now.toISOString(),
    dueAt: deadline.toISOString(),
    dueAtText: formatBusinessDateTime(deadline),
    windowHours: FEEDBACK_WINDOW_HOURS,
    reviewStatus: "PENDING_REVIEW",
    message: "反馈已提交，等待教务审核后发布给家长。",
  });
}
