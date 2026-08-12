import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappTeacher } from "@/app/api/miniapp/staff/teacher/_lib";
import { getTeacherManagerFeedbackState } from "@/lib/manager-teacher-feedback";

export async function GET(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  try {
    const state = await getTeacherManagerFeedbackState(access.teacherId);
    return ok({
      pendingCount: state.pendingAckCount,
      items: state.feedbacks.filter((item) => item.requiresAck && !item.acknowledgedAt),
    });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "课程安排确认读取失败。", 500);
  }
}
