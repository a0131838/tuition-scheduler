import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function fmtRange(startAt: Date, endAt: Date) {
  return `${new Date(startAt).toLocaleString()} - ${new Date(endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
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

  const deadline = new Date(new Date(session.endAt).getTime() + 12 * 60 * 60 * 1000);
  const content = [
    "[Proxy Draft / 代填草稿 - Admin / 教务]",
    `Session / 课次: ${buildSessionLine(session)}`,
    "Reason / 原因: Teacher feedback overdue more than 12 hours. / 老师反馈超过12小时未提交。",
    `Note / 备注: ${note || "Pending teacher completion / 待老师补全"}`,
  ].join("\n");

  await prisma.sessionFeedback.upsert({
    where: { sessionId_teacherId: { sessionId, teacherId } },
    update: {
      content,
      classPerformance: "Proxy draft by admin. Pending teacher completion.",
      homework: "Pending teacher completion.",
      status: "PROXY_DRAFT",
      dueAt: deadline,
      isProxyDraft: true,
      proxyNote: note || "Auto-created due to >12h overdue feedback.",
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
      proxyNote: note || "Auto-created due to >12h overdue feedback.",
      submittedByRole: "ADMIN",
      submittedByUserId: admin.id,
      submittedAt: new Date(),
    },
  });

  return Response.json({ ok: true });
}

