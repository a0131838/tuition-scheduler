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
