import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function isFinalTeacherFeedback(feedback: { isProxyDraft?: boolean | null; status?: string | null }) {
  if (!feedback) return false;
  if (feedback.isProxyDraft) return false;
  if (feedback.status === "PROXY_DRAFT") return false;
  return true;
}

function fmtRange(startAt: Date, endAt: Date) {
  return `${new Date(startAt).toLocaleString()} - ${new Date(endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function getStudentNames(session: any) {
  const classStudentNames = session.class.enrollments.map((e: any) => e.student.name).filter(Boolean);
  if (session.class.capacity === 1) {
    const onlyStudent = session.student?.name ?? session.class.oneOnOneStudent?.name ?? (classStudentNames[0] ?? null);
    return onlyStudent ? [onlyStudent] : [];
  }
  return Array.from(new Set(classStudentNames));
}

function buildManualContent(session: any, channel: string, note: string) {
  const classLine = `${session.class.course.name}${session.class.subject ? ` / ${session.class.subject.name}` : ""}${
    session.class.level ? ` / ${session.class.level.name}` : ""
  }`;
  const students = getStudentNames(session);
  return [
    `[Manual Forwarded / 手工转发 - ${channel}]`,
    `Session / 课次: ${fmtRange(session.startAt, session.endAt)}`,
    `Class / 班级: ${classLine}`,
    `Students / 学生: ${students.length > 0 ? students.join(", ") : "-"}`,
    "",
    "Marked as already sent by admin.",
    note ? `Note / 备注: ${note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const studentId = String(body?.studentId ?? "").trim();
  const note = String(body?.note ?? "").trim();
  const channel = "WeChat";

  const now = new Date();
  const overdueAt = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const lookback = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const sessions = await prisma.session.findMany({
    where: {
      endAt: { gte: lookback, lte: overdueAt },
      ...(studentId ? { OR: [{ studentId }, { class: { enrollments: { some: { studentId } } } }] } : {}),
    },
    include: {
      teacher: true,
      student: true,
      feedbacks: true,
      class: {
        include: {
          teacher: true,
          course: true,
          subject: true,
          level: true,
          oneOnOneStudent: true,
          enrollments: { include: { student: true } },
        },
      },
    },
    orderBy: { endAt: "desc" },
    take: 1500,
  });

  let created = 0;
  let updated = 0;
  let alreadyForwarded = 0;
  let skippedNoTeacher = 0;

  for (const session of sessions) {
    const teacherId = session.teacherId ?? session.class.teacherId;
    if (!teacherId) {
      skippedNoTeacher += 1;
      continue;
    }

    const existing = session.feedbacks.find((f) => f.teacherId === teacherId) ?? null;
    const dueAt = new Date(new Date(session.endAt).getTime() + 12 * 60 * 60 * 1000);
    const manualContent = buildManualContent(session, channel, note);

    if (existing && isFinalTeacherFeedback(existing)) {
      if (existing.forwardedAt) {
        alreadyForwarded += 1;
        continue;
      }

      await prisma.sessionFeedback.update({
        where: { id: existing.id },
        data: {
          forwardedAt: now,
          forwardedBy: admin.name,
          forwardChannel: channel,
          forwardNote: note || "Historical overdue feedback marked as sent via WeChat.",
        },
      });
      updated += 1;
      continue;
    }

    if (existing) {
      await prisma.sessionFeedback.update({
        where: { id: existing.id },
        data: {
          content: existing.content || manualContent,
          classPerformance: existing.classPerformance || "Marked by admin as already sent via WeChat.",
          homework: existing.homework || "Already shared via WeChat.",
          status: "LATE",
          dueAt,
          isProxyDraft: false,
          proxyNote: null,
          submittedByRole: "ADMIN",
          submittedByUserId: admin.id,
          submittedAt: existing.submittedAt ?? now,
          forwardedAt: now,
          forwardedBy: admin.name,
          forwardChannel: channel,
          forwardNote: note || "Historical overdue feedback marked as sent via WeChat.",
        },
      });
      updated += 1;
      continue;
    }

    await prisma.sessionFeedback.create({
      data: {
        sessionId: session.id,
        teacherId,
        content: manualContent,
        classPerformance: "Marked by admin as already sent via WeChat.",
        homework: "Already shared via WeChat.",
        status: "LATE",
        dueAt,
        isProxyDraft: false,
        submittedByRole: "ADMIN",
        submittedByUserId: admin.id,
        submittedAt: now,
        forwardedAt: now,
        forwardedBy: admin.name,
        forwardChannel: channel,
        forwardNote: note || "Historical overdue feedback marked as sent via WeChat.",
      },
    });
    created += 1;
  }

  const summary = `created ${created}, updated ${updated}, alreadyForwarded ${alreadyForwarded}, skippedNoTeacher ${skippedNoTeacher}`;
  return Response.json({
    ok: true,
    created,
    updated,
    alreadyForwarded,
    skippedNoTeacher,
    summary,
  });
}
