import { prisma } from "./prisma";
import { sessionBelongsToStudentWhere } from "./session-students";
import { formatBusinessDateTime, formatBusinessTimeOnly } from "./date-only";
import { checkResultEvidence } from "./ticket-result-evidence";
import { applyAdminLinkedTicketSchedulingAction } from "./ticket-scheduling-action-write";

const include = {
  teacher: { select: { id: true, name: true } },
  class: { include: { teacher: { select: { id: true, name: true } }, course: true, subject: true, level: true } },
  attendances: true,
} as const;

function lessonDto(row: any, studentId: string) {
  const attendance = row.attendances.find((item: any) => item.studentId === studentId);
  const cancelled = attendance?.status === "EXCUSED";
  const courseLabel = [row.class.course.name, row.class.subject?.name, row.class.level?.name].filter(Boolean).join(" / ");
  const state = cancelled ? "已取消" : attendance?.status === "PRESENT" || attendance?.status === "LATE" ? "已出勤" : "已排课";
  return { id: row.id, startAt: row.startAt, endAt: row.endAt, teacherId: row.teacher?.id ?? row.class.teacherId,
    courseLabel, cancelled, charge: Boolean(attendance?.excusedCharge),
    label: `${formatBusinessDateTime(row.startAt)}–${formatBusinessTimeOnly(row.endAt)} · ${courseLabel} · ${row.teacher?.name ?? row.class.teacher.name} · ${state}` };
}

export async function ticketResultCandidates(ticketId: string, actionId: string | null, date: string | null, page = 0) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { schedulingActions: true } });
  if (!ticket?.studentId) throw new Error("工单未关联学生。");
  const action = actionId ? ticket.schedulingActions.find((row) => row.id === actionId) : null;
  if (actionId && !action) throw new Error("工单动作不存在。");
  let anchor = action?.requestedStartAt ?? ticket.createdAt;
  if (action?.sourceSessionId) {
    const source = await prisma.session.findUnique({ where: { id: action.sourceSessionId }, select: { startAt: true } });
    if (source) anchor = source.startAt;
  }
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : formatBusinessDateTime(anchor).slice(0, 10);
  const start = new Date(`${day}T00:00:00+08:00`);
  if (!Number.isFinite(start.getTime())) throw new Error("日期无效。");
  const end = new Date(start.getTime() + 31 * 86400000);
  const where = { ...sessionBelongsToStudentWhere(ticket.studentId), startAt: { gte: start, lt: end } };
  const safePage = Number.isSafeInteger(page) ? Math.max(0, Math.min(page, 1000)) : 0;
  const rows = await prisma.session.findMany({ where, include, orderBy: [{ startAt: "asc" }, { id: "asc" }], take: 51, skip: safePage * 50 });
  return { date: day, page: safePage, hasMore: rows.length > 50, lessons: rows.slice(0, 50).map((row) => lessonDto(row, ticket.studentId!)) };
}

export async function linkTicketResults(input: {
  ticketId: string; actionId: string; resultSessionIds: string[]; verified: boolean; note: string; confirmedChange: boolean;
  user: { id: string; email: string; name: string | null; role: string };
}) {
  if (!input.verified) throw new Error("请先核对课程结果。");
  if (input.confirmedChange && input.note.trim().length < 5) throw new Error("请填写需求变更的确认依据。");
  return prisma.$transaction(async (tx) => {
    // Serialize result verification and direct execution against the same ticket.
    await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${input.ticketId} FOR UPDATE`;
    const action = await tx.ticketSchedulingAction.findFirst({ where: { id: input.actionId, ticketId: input.ticketId }, include: { ticket: true } });
    if (!action?.ticket.studentId || action.ticket.isArchived || ["Completed", "Cancelled"].includes(action.ticket.status) || ["APPLIED", "CANCELLED"].includes(action.status)) throw new Error("工单或动作已结束，请刷新查看结果。");
    if (!["CREATE_SESSION", "CANCEL_SESSION", "RESCHEDULE_SESSION", "REPLACE_TEACHER"].includes(action.actionType)) throw new Error("此动作不支持课程结果核验。");
    const studentId = action.ticket.studentId;
    const ids = action.actionType === "CREATE_SESSION"
      ? [...new Set([...(action.resultSessionIds ?? []), ...input.resultSessionIds])]
      : action.sourceSessionId ? [action.sourceSessionId] : [];
    if (!ids.length || ids.length > 100) throw new Error("请选择对应课程，最多100节。");
    const rows = await tx.session.findMany({ where: { id: { in: ids }, ...sessionBelongsToStudentWhere(studentId) }, include, orderBy: { startAt: "asc" } });
    if (rows.length !== ids.length) throw new Error("所选课程已删除或不属于该学生，请重新核对。");
    const lessons = rows.map((row) => lessonDto(row, studentId));
    const evidence = checkResultEvidence(action, lessons, input.confirmedChange);
    if (evidence.errors.length) throw new Error(evidence.errors.join(" "));
    const resultText = `已核验${action.actionType === "CANCEL_SESSION" ? "取消" : "课程"}：${lessons.map((row) => row.label).join("；")}。`;
    const state = await applyAdminLinkedTicketSchedulingAction(tx, {
      ticketId: input.ticketId, actionId: input.actionId, actionType: action.actionType,
      sourceSessionId: action.sourceSessionId, resultSessionId: ids[0], resultSessionIds: ids,
      appliedByUserId: input.user.id, actorEmail: input.user.email, actorName: input.user.name, actorRole: input.user.role,
      auditAction: "ADMIN_LINK_EXISTING_SCHEDULING_RESULT", resultText,
      verification: { confirmedChange: input.confirmedChange, note: input.note.trim(), differences: evidence.differences },
    });
    if (input.note.trim() || evidence.differences.length) {
      await tx.ticketSchedulingAction.update({ where: { id: action.id }, data: {
        notes: `${action.notes ?? ""}\n\n[Existing result linked] ${input.note.trim()}${evidence.differences.length ? `\n已确认变更：${evidence.differences.join("；")}` : ""}`,
      } });
    }
    return { ...state, resultText, totalMinutes: evidence.totalMinutes, expectedCount: evidence.expectedCount };
  });
}
