import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { issueAiMiniappDelegation } from "@/lib/ai-miniapp-delegation";
import { formatBusinessDateTime } from "@/lib/date-only";
import { recordTeacherConfirmationByStaff } from "@/lib/manager-teacher-feedback";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import { prisma } from "@/lib/prisma";

function canCoordinate(role: string) { return role === "ADMIN" || role === "CS"; }

function config() {
  const baseUrl = String(process.env.SGT_AI_BASE_URL || "").trim().replace(/\/$/, "");
  const secret = String(process.env.SGT_AI_MINIAPP_SHARED_SECRET || "").trim();
  if (!baseUrl || secret.length < 32) throw new Error("AI 工作台尚未配置。");
  return { baseUrl, secret };
}

async function callAi(path: string, token: string, init?: RequestInit) {
  const { baseUrl } = config();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "AI 工作台暂时无法访问。");
  return result;
}

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  try {
    const { secret } = config();
    const token = issueAiMiniappDelegation(auth.user, secret);
    const result = await callAi("/api/miniapp-ai/work-queue", token);
    const pendingTeacherConsents = canCoordinate(auth.user.role) ? await prisma.managerTeacherFeedback.findMany({
      where: { category: "ACTION_REQUIRED", requiresAck: true, acknowledgedAt: null, archivedAt: null, ticketId: { not: null } },
      select: { id: true, body: true, createdAt: true, teacher: { select: { name: true } }, ticket: { select: { studentName: true } } },
      orderBy: { createdAt: "asc" }, take: 30,
    }) : [];
    return ok({ ...result, pendingTeacherConsents: pendingTeacherConsents.map((row) => ({ id: row.id, teacherName: row.teacher.name, studentName: row.ticket?.studentName || "学生", detail: row.body, createdAt: formatBusinessDateTime(row.createdAt) })) });
  } catch (error) { return bad(error instanceof Error ? error.message : "AI 工作台读取失败。", 503); }
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  const intakeId = String(body?.intakeId || "").trim();
  const action = String(body?.action || "").trim();
  if (action === "record_teacher_consent") {
    if (!canCoordinate(auth.user.role)) return bad("只有教务或管理人员可以代录老师确认。", 403);
    try {
      const result = await recordTeacherConfirmationByStaff({ feedbackId: String(body?.feedbackId || ""), staffUserId: auth.user.id, staffEmail: auth.user.email, staffName: auth.user.name, staffRole: auth.user.role, channel: body?.channel === "PHONE" ? "PHONE" : "WECHAT", note: String(body?.note || "") });
      if (result.ticketCompleted && result.ticket?.parentVisible && result.ticket.studentId) {
        try {
          await queueMiniappNotificationsForStudent({ studentId: result.ticket.studentId, templateKey: MINIAPP_TEMPLATE_KEYS.requestStatusChanged, eventType: "REQUEST_STATUS_CHANGED", targetType: "Ticket", targetId: `${result.ticket.id}:${result.ticket.updatedAt}`, permission: "canCreateRequests", payload: { ticketNo: result.ticket.ticketNo, type: result.ticket.type, status: "Completed", ticketId: result.ticket.id, studentName: result.ticket.studentName, updatedAt: result.ticket.updatedAt } });
        } catch (error) {
          await prisma.ticket.update({
            where: { id: result.ticket.id },
            data: {
              status: "Exception",
              nextAction: "老师同意已留痕，但家长通知排队失败；请在通知中心重试。",
              completedAt: null,
              completedByUserId: null,
              risksNotes: `家长通知排队失败：${error instanceof Error ? error.message : "未知错误"}`,
            },
          });
          return bad("老师同意已保存，但家长通知未能排队，已交给教务处理。", 409);
        }
      }
      return ok({ message: result.ticketCompleted ? "老师同意已留痕，家长可查看最终安排。" : "老师确认已留痕，仍在等待其他受影响老师。" });
    } catch (error) { return bad(error instanceof Error ? error.message : "代录老师确认失败。", 409); }
  }
  if (!intakeId || !["prepare", "resolve_target_session", "refresh", "subject_teacher_plan"].includes(action)) return bad("请求无效。", 400);
  try {
    const { secret } = config();
    const token = issueAiMiniappDelegation(auth.user, secret);
    const path = action === "resolve_target_session"
      ? "/api/miniapp-ai/resolve-target-session"
      : action === "refresh" ? "/api/miniapp-ai/refresh-ticket"
      : action === "subject_teacher_plan" ? "/api/miniapp-ai/subject-teacher-plan" : "/api/miniapp-ai/autopilot";
    const payload = action === "refresh"
      ? { ticketId: String(body?.ticketId || "").trim() }
      : action === "subject_teacher_plan"
      ? {
          ticketId: String(body?.ticketId || "").trim(),
          subjectTeacherPreferences: body?.subjectTeacherPreferences && typeof body.subjectTeacherPreferences === "object" ? body.subjectTeacherPreferences : {},
        }
      : action === "resolve_target_session"
      ? { intakeId, sessionId: String(body?.sessionId || "").trim() }
      : {
          intakeId,
          ...(typeof body?.charge === "boolean" ? { charge: body.charge } : {}),
          note: String(body?.note || "").trim(),
          newTeacherId: String(body?.newTeacherId || "").trim(),
          reason: String(body?.reason || "").trim(),
          subjectTeacherPreferences: body?.subjectTeacherPreferences && typeof body.subjectTeacherPreferences === "object" ? body.subjectTeacherPreferences : {},
        };
    if (action === "resolve_target_session" && !payload.sessionId) return bad("请选择目标课次。", 400);
    if (action === "refresh" && !("ticketId" in payload && payload.ticketId)) return bad("正式工单编号缺失。", 400);
    if (action === "subject_teacher_plan" && !("ticketId" in payload && payload.ticketId)) return bad("正式工单编号缺失。", 400);
    const result = await callAi(path, token, { method: "POST", body: JSON.stringify(payload) });
    return ok(result);
  } catch (error) { return bad(error instanceof Error ? error.message : "AI 处理失败。", 409); }
}
