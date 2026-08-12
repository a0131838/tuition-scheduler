import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappTeacher } from "@/app/api/miniapp/staff/teacher/_lib";
import { acknowledgeManagerTeacherFeedback } from "@/lib/manager-teacher-feedback";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ feedbackId: string }> }) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const { feedbackId } = await context.params;
  try {
    const body = await req.json().catch(() => ({}));
    if (String(body?.decision ?? "CONFIRM") === "ISSUE") {
      const note = String(body?.note ?? "").trim().slice(0, 500);
      if (note.length < 3) return bad("请简要说明安排哪里有问题。", 400);
      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.managerTeacherFeedback.findFirst({
          where: { id: feedbackId, teacherId: access.teacherId, archivedAt: null },
          select: { id: true, ticketId: true, acknowledgedAt: true },
        });
        if (!current) throw new Error("课程安排通知不存在。");
        if (!current.acknowledgedAt) await tx.managerTeacherFeedback.update({ where: { id: current.id }, data: { acknowledgedAt: new Date(), acknowledgedByUserId: access.user.id } });
        const ticket = current.ticketId ? await tx.ticket.update({
          where: { id: current.ticketId },
          data: { status: "Exception", nextAction: `老师反馈安排有问题：${note}。教务需立即联系老师并向家长更新协调进度。`, nextActionDue: new Date(), completedAt: null, completedByUserId: null, lastUpdateAt: new Date() },
          select: { id: true, ticketNo: true, type: true, studentId: true, studentName: true, parentVisible: true, updatedAt: true },
        }) : null;
        await tx.auditLog.create({ data: { actorEmail: access.user.email, actorName: access.user.name, actorRole: access.user.role, module: "TICKETS", action: "TEACHER_REPORTED_ARRANGEMENT_ISSUE", entityType: current.ticketId ? "Ticket" : "ManagerTeacherFeedback", entityId: current.ticketId ?? current.id, meta: { feedbackId: current.id, note } } });
        return { ticketId: current.ticketId, ticket };
      });
      if (result.ticket?.parentVisible && result.ticket.studentId) {
        try {
          await queueMiniappNotificationsForStudent({
            studentId: result.ticket.studentId,
            templateKey: MINIAPP_TEMPLATE_KEYS.requestStatusChanged,
            eventType: "REQUEST_STATUS_CHANGED",
            targetType: "Ticket",
            targetId: `${result.ticket.id}:${result.ticket.updatedAt}`,
            permission: "canCreateRequests",
            payload: {
              ticketNo: result.ticket.ticketNo,
              type: result.ticket.type,
              status: "Exception",
              ticketId: result.ticket.id,
              studentName: result.ticket.studentName,
              updatedAt: result.ticket.updatedAt,
            },
          });
        } catch {
          // 工单已明确进入教务异常队列；通知中心可随后重试，不回滚老师的问题反馈。
        }
      }
      return ok({ message: result.ticketId ? "已通知教务重新协调；系统不会自动撤销课程。" : "问题已记录并通知教务。" });
    }
    const result = await acknowledgeManagerTeacherFeedback({ feedbackId, teacherId: access.teacherId, userId: access.user.id });
    if (result.ticketCompleted && result.ticket?.parentVisible && result.ticket.studentId) {
      try {
        await queueMiniappNotificationsForStudent({
          studentId: result.ticket.studentId,
          templateKey: MINIAPP_TEMPLATE_KEYS.requestStatusChanged,
          eventType: "REQUEST_STATUS_CHANGED",
          targetType: "Ticket",
          targetId: `${result.ticket.id}:${result.ticket.updatedAt}`,
          permission: "canCreateRequests",
          payload: {
            ticketNo: result.ticket.ticketNo, type: result.ticket.type, status: "Completed",
            ticketId: result.ticket.id, studentName: result.ticket.studentName, updatedAt: result.ticket.updatedAt,
          },
        });
      } catch (error) {
        await prisma.ticket.update({
          where: { id: result.ticket.id },
          data: {
            status: "Exception", nextAction: "老师已确认，但家长通知排队失败；请在通知中心重试。",
            completedAt: null, completedByUserId: null,
            risksNotes: `家长通知排队失败：${error instanceof Error ? error.message : "未知错误"}`,
          },
        });
        return bad("课程确认已保存，但家长通知未能排队，已交给教务处理。", 409);
      }
    }
    return ok({ message: result.ticketCompleted ? "已确认，工单和家长状态已同步。" : "已确认课程安排。" });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "课程安排确认失败。", 409);
  }
}
