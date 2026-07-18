import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappTeacher } from "@/app/api/miniapp/staff/teacher/_lib";
import { logAudit } from "@/lib/audit-log";
import { formatBusinessDateTime } from "@/lib/date-only";
import { parseParentFeedbackSections } from "@/lib/parent-feedback-format";
import { prisma } from "@/lib/prisma";

async function taughtStudents(teacherId: string) {
  return prisma.attendance.findMany({
    where: {
      session: { OR: [{ teacherId }, { teacherId: null, class: { teacherId } }] },
    },
    select: { student: { select: { id: true, name: true } } },
    distinct: ["studentId"],
  });
}

function summaryText(content: string) {
  const sections = parseParentFeedbackSections(content);
  const first = Object.values(sections).find((value) => String(value ?? "").trim());
  const text = String(first || content || "").replace(/\s+/g, " ").trim();
  return text.length > 72 ? `${text.slice(0, 72)}…` : text;
}

export async function GET(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const url = new URL(req.url);
  const selectedStudentId = String(url.searchParams.get("studentId") ?? "").trim();
  const query = String(url.searchParams.get("q") ?? "").trim().toLowerCase();
  const taught = await taughtStudents(access.teacherId);
  const studentMap = new Map(taught.map((row) => [row.student.id, row.student.name]));
  const taughtIds = Array.from(studentMap.keys());
  if (!taughtIds.length) return ok({ summary: { students: 0, unreadOther: 0 }, students: [], selectedStudent: null, timeline: [] });
  if (selectedStudentId && !studentMap.has(selectedStudentId)) return bad("该学生不在你的教学记录中", 403);

  const recentFeedbacks = await prisma.sessionFeedback.findMany({
    where: {
      content: { not: "" },
      session: { attendances: { some: { studentId: { in: taughtIds } } } },
    },
    select: {
      id: true,
      teacherId: true,
      submittedAt: true,
      content: true,
      teacher: { select: { name: true } },
      session: {
        select: {
          attendances: { where: { studentId: { in: taughtIds } }, select: { studentId: true } },
          class: { select: { course: { select: { name: true } }, subject: { select: { name: true } } } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 2000,
  });
  const readRows = await prisma.teacherFeedbackRead.findMany({
    where: { userId: access.user.id, feedbackId: { in: recentFeedbacks.map((row) => row.id) } },
    select: { feedbackId: true },
  });
  const readSet = new Set(readRows.map((row) => row.feedbackId));
  const studentStates = new Map<string, { id: string; name: string; feedbackCount: number; unreadOtherCount: number; latestText: string; latestAt: Date | null }>();
  for (const [id, name] of studentMap) {
    studentStates.set(id, { id, name, feedbackCount: 0, unreadOtherCount: 0, latestText: "暂无历史反馈", latestAt: null });
  }
  for (const feedback of recentFeedbacks) {
    for (const attendance of feedback.session.attendances) {
      const state = studentStates.get(attendance.studentId);
      if (!state) continue;
      state.feedbackCount += 1;
      if (feedback.teacherId !== access.teacherId && !readSet.has(feedback.id)) state.unreadOtherCount += 1;
      if (!state.latestAt || feedback.submittedAt > state.latestAt) {
        state.latestAt = feedback.submittedAt;
        state.latestText = summaryText(feedback.content);
      }
    }
  }
  const students = Array.from(studentStates.values())
    .filter((item) => !query || item.name.toLowerCase().includes(query))
    .sort((a, b) => b.unreadOtherCount - a.unreadOtherCount || (b.latestAt?.getTime() ?? 0) - (a.latestAt?.getTime() ?? 0))
    .map((item) => ({
      id: item.id,
      name: item.name,
      feedbackCount: item.feedbackCount,
      unreadOtherCount: item.unreadOtherCount,
      latestText: item.latestText,
      latestAtText: item.latestAt ? formatBusinessDateTime(item.latestAt) : "",
    }));

  let timeline: Array<Record<string, unknown>> = [];
  if (selectedStudentId) {
    const rows = await prisma.sessionFeedback.findMany({
      where: {
        content: { not: "" },
        session: { attendances: { some: { studentId: selectedStudentId } } },
      },
      include: {
        teacher: { select: { name: true } },
        session: {
          select: {
            startAt: true,
            class: {
              select: {
                course: { select: { name: true } },
                subject: { select: { name: true } },
                level: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ session: { startAt: "desc" } }, { submittedAt: "desc" }],
      take: 200,
    });
    const selectedReadRows = rows.length
      ? await prisma.teacherFeedbackRead.findMany({
          where: { userId: access.user.id, feedbackId: { in: rows.map((row) => row.id) } },
          select: { feedbackId: true },
        })
      : [];
    const selectedReadSet = new Set(selectedReadRows.map((row) => row.feedbackId));
    timeline = rows.map((row) => ({
      id: row.id,
      teacherName: row.teacher.name,
      isMine: row.teacherId === access.teacherId,
      isRead: row.teacherId === access.teacherId || selectedReadSet.has(row.id),
      sessionText: formatBusinessDateTime(row.session.startAt),
      submittedText: formatBusinessDateTime(row.submittedAt),
      courseLabel: [row.session.class.course.name, row.session.class.subject?.name, row.session.class.level?.name].filter(Boolean).join(" / "),
      sections: parseParentFeedbackSections(row.classPerformance || row.content),
      homework: row.homework || "",
      previousHomeworkDone: row.previousHomeworkDone === true ? "已完成" : row.previousHomeworkDone === false ? "未完成" : "未记录",
      summary: summaryText(row.content),
    }));
  }

  return ok({
    summary: { students: studentMap.size, unreadOther: students.reduce((sum, item) => sum + item.unreadOtherCount, 0) },
    students,
    selectedStudent: selectedStudentId ? { id: selectedStudentId, name: studentMap.get(selectedStudentId) } : null,
    timeline,
  });
}

export async function POST(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const body = await req.json().catch(() => null);
  const studentId = String(body?.studentId ?? "").trim();
  const feedbackIds: string[] = Array.from(
    new Set<string>(
      (Array.isArray(body?.feedbackIds) ? body.feedbackIds : [])
        .map((value: unknown) => String(value).trim())
        .filter((value: string) => Boolean(value))
    )
  ).slice(0, 200);
  if (!studentId || !feedbackIds.length) return bad("缺少反馈已读信息", 409);
  const taught = await taughtStudents(access.teacherId);
  if (!taught.some((row) => row.student.id === studentId)) return bad("该学生不在你的教学记录中", 403);
  const allowed = await prisma.sessionFeedback.findMany({
    where: { id: { in: feedbackIds }, session: { attendances: { some: { studentId } } } },
    select: { id: true },
  });
  if (!allowed.length) return bad("没有可标记的反馈", 409);
  await prisma.teacherFeedbackRead.createMany({
    data: allowed.map((row) => ({ userId: access.user.id, feedbackId: row.id, studentId })),
    skipDuplicates: true,
  });
  await logAudit({
    actor: access.user,
    module: "TEACHER_FEEDBACK",
    action: "READ_TIMELINE_MINIAPP",
    entityType: "Student",
    entityId: studentId,
    meta: { studentId, feedbackIds: allowed.map((row) => row.id), feedbackCount: allowed.length },
  });
  return ok({ message: "已标记为已读", count: allowed.length });
}
