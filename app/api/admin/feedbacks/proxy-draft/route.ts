import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";
import { getFeedbackDueAt } from "@/lib/feedback-timing";
import { isFinalTeacherFeedback } from "@/lib/session-feedback-state";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function fmtRange(startAt: Date, endAt: Date) {
  return `${formatBusinessDateTime(new Date(startAt))} - ${formatBusinessTimeOnly(new Date(endAt))}`;
}

function buildSessionLine(session: any) {
  const plannedTime = fmtRange(session.startAt, session.endAt);
  const courseLine = `${session.class.course.name}${session.class.subject ? ` / ${session.class.subject.name}` : ""}${session.class.level ? ` / ${session.class.level.name}` : ""}`;
  return `${plannedTime} | ${courseLine}`;
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const sessionId = String(body?.sessionId ?? "");
  const teacherId = String(body?.teacherId ?? "");
  const note = String(body?.note ?? "").trim();
  if (!sessionId || !teacherId) return bad("Missing session or teacher", 409);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: { include: { course: true, subject: true, level: true } } },
  });
  if (!session) return bad("Session not found", 404);
  if ((session.teacherId ?? session.class.teacherId) !== teacherId) return bad("Teacher assignment changed / 课次老师已变更", 409);

  const deadline = getFeedbackDueAt(session.endAt, session.feedbackAvailableAt);
  if (new Date() <= deadline) return bad("Feedback is still within its submission window / 反馈仍在提交期限内，无需创建超时草稿", 409);
  const content = [
    "[Proxy Draft / 代填草稿 - Admin / 教务]",
    `Session / 课次: ${buildSessionLine(session)}`,
    `Reason / 原因: Feedback deadline passed / 已超过反馈提交期限: ${formatBusinessDateTime(deadline)}`,
    `Note / 备注: ${note || "Pending teacher completion / 待老师补全"}`,
  ].join("\n");

  const saved = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${sessionId} FOR UPDATE`;
    const current = await tx.session.findUnique({ where: { id: sessionId }, include: { class: true } });
    if (!current || (current.teacherId ?? current.class.teacherId) !== teacherId || new Date() <= getFeedbackDueAt(current.endAt, current.feedbackAvailableAt)) return false;
    const existing = await tx.sessionFeedback.findUnique({ where: { sessionId_teacherId: { sessionId, teacherId } } });
    if (isFinalTeacherFeedback(existing)) return false;
    await tx.sessionFeedback.upsert({
    where: { sessionId_teacherId: { sessionId, teacherId } },
    update: {
      content,
      classPerformance: "Proxy draft by admin. Pending teacher completion.",
      homework: "Pending teacher completion.",
      status: "PROXY_DRAFT",
      dueAt: deadline,
      isProxyDraft: true,
      proxyNote: note || "Feedback deadline passed; teacher completion pending.",
      submittedByRole: "ADMIN",
      submittedByUserId: admin.id,
      submittedAt: new Date(),
    },
    create: {
      sessionId,
      teacherId,
      content,
      classPerformance: "Proxy draft by admin. Pending teacher completion.",
      homework: "Pending teacher completion.",
      status: "PROXY_DRAFT",
      dueAt: deadline,
      isProxyDraft: true,
      proxyNote: note || "Feedback deadline passed; teacher completion pending.",
      submittedByRole: "ADMIN",
      submittedByUserId: admin.id,
      submittedAt: new Date(),
    },
    });
    return true;
  });
  if (!saved) return bad("Feedback or lesson changed; reload. Submitted feedback has been preserved / 反馈或课次已变化，请刷新；已提交反馈保持不变", 409);

  return Response.json({ ok: true });
}
