import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappTeacher } from "@/app/api/miniapp/staff/teacher/_lib";
import { logAudit } from "@/lib/audit-log";
import { formatBusinessDateOnly } from "@/lib/date-only";
import { FINAL_REPORT_RECOMMENDATIONS, parseFinalReportDraft } from "@/lib/final-report";
import { acknowledgeManagerTeacherFeedback, getTeacherManagerFeedbackState } from "@/lib/manager-teacher-feedback";
import { cleanMiniappText, isReportEditable } from "@/lib/miniapp-staff-action-center";
import { parseReportDraft } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import { getTeacherNoticeState, markTeacherNoticeRead } from "@/lib/teacher-notices";

function midtermLocked(raw: unknown) {
  if (!raw || typeof raw !== "object") return false;
  const meta = (raw as any)._meta;
  return Boolean(meta && typeof meta === "object" && meta.lockedAfterForwarded);
}

function reportDto(row: any, kind: "MIDTERM" | "FINAL") {
  const editable = isReportEditable(row.status, row.archivedAt) && (kind === "FINAL" ? row.status !== "FORWARDED" : !midtermLocked(row.reportJson));
  return {
    id: row.id,
    kind,
    studentName: row.student.name,
    courseName: [row.course.name, row.subject?.name].filter(Boolean).join(" / "),
    status: row.status,
    assignedText: formatBusinessDateOnly(row.assignedAt),
    submittedText: row.submittedAt ? formatBusinessDateOnly(row.submittedAt) : "",
    reportPeriodLabel: row.reportPeriodLabel || "",
    editable,
    draft: kind === "FINAL" ? parseFinalReportDraft({ ...(row.reportJson && typeof row.reportJson === "object" ? row.reportJson : {}), recommendedNextStep: row.recommendation || (row.reportJson as any)?.recommendedNextStep }) : parseReportDraft(row.reportJson),
  };
}

export async function GET(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const [noticeState, feedbackState, midterms, finals] = await Promise.all([
    getTeacherNoticeState(access.user.id),
    getTeacherManagerFeedbackState(access.teacherId),
    prisma.midtermReport.findMany({ where: { teacherId: access.teacherId, archivedAt: null, status: { not: "EXEMPT" } }, include: { student: true, course: true, subject: true }, orderBy: { assignedAt: "desc" }, take: 50 }),
    prisma.finalReport.findMany({ where: { teacherId: access.teacherId, archivedAt: null, status: { not: "EXEMPT" } }, include: { student: true, course: true, subject: true }, orderBy: { assignedAt: "desc" }, take: 50 }),
  ]);
  return ok({
    summary: { unreadNotices: noticeState.unreadNotices.length, pendingManagerFeedback: feedbackState.pendingAckCount, pendingReports: midterms.filter((row) => row.status === "ASSIGNED").length + finals.filter((row) => row.status === "ASSIGNED").length },
    notices: noticeState.notices.map((notice) => ({ ...notice, read: Boolean(noticeState.readMap[notice.id]) })),
    managerFeedbacks: feedbackState.feedbacks,
    reports: [...midterms.map((row) => reportDto(row, "MIDTERM")), ...finals.map((row) => reportDto(row, "FINAL"))].sort((a, b) => b.assignedText.localeCompare(a.assignedText)),
    recommendations: FINAL_REPORT_RECOMMENDATIONS,
  });
}

export async function POST(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const body = await req.json().catch(() => null);
  const action = cleanMiniappText((body as any)?.action, 40);
  const id = cleanMiniappText((body as any)?.id, 80);
  if (!action || !id) return bad("Invalid action");

  if (action === "ACK_NOTICE") {
    const state = await getTeacherNoticeState(access.user.id);
    if (!state.notices.some((notice) => notice.id === id)) return bad("Notice not found", 404);
    await markTeacherNoticeRead(access.user.id, id);
    await logAudit({ actor: access.user, module: "teacher-notices", action: "ACK_MINIAPP", entityType: "TeacherNotice", entityId: id });
    return ok({ completed: true });
  }
  if (action === "ACK_MANAGER_FEEDBACK") {
    const result = await acknowledgeManagerTeacherFeedback({ feedbackId: id, teacherId: access.teacherId, userId: access.user.id });
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
            ticketNo: result.ticket.ticketNo,
            type: result.ticket.type,
            status: "Completed",
            ticketId: result.ticket.id,
            studentName: result.ticket.studentName,
            updatedAt: result.ticket.updatedAt,
          },
        });
      } catch (error) {
        await prisma.ticket.update({
          where: { id: result.ticket.id },
          data: {
            status: "Exception",
            nextAction: "老师已确认，但家长通知排队失败；请在通知中心重试。",
            completedAt: null,
            completedByUserId: null,
            risksNotes: `家长通知排队失败：${error instanceof Error ? error.message : "未知错误"}`,
          },
        });
        return bad("课程确认已保存，但家长通知未能排队，已交给教务处理。", 409);
      }
    }
    await logAudit({ actor: access.user, module: "manager-teacher-feedback", action: "ACK_MINIAPP", entityType: "ManagerTeacherFeedback", entityId: id });
    return ok({ completed: true, ticketCompleted: result.ticketCompleted });
  }
  if (!["SAVE_REPORT", "SUBMIT_REPORT"].includes(action)) return bad("Unsupported action");
  const kind = cleanMiniappText((body as any)?.kind, 20).toUpperCase();
  const draftInput = (body as any)?.draft && typeof (body as any).draft === "object" ? (body as any).draft : {};
  const submit = action === "SUBMIT_REPORT";

  if (kind === "MIDTERM") {
    const report = await prisma.midtermReport.findFirst({ where: { id, teacherId: access.teacherId }, select: { id: true, status: true, submittedAt: true, archivedAt: true, reportJson: true } });
    if (!report) return bad("Report not found", 404);
    if (!isReportEditable(report.status, report.archivedAt) || midtermLocked(report.reportJson)) return bad("Report is read only", 409);
    const current = parseReportDraft(report.reportJson);
    const draft = {
      ...current,
      overallSummary: cleanMiniappText(draftInput.overallSummary, 4000),
      keyStrengths: cleanMiniappText(draftInput.keyStrengths, 3000),
      primaryBottlenecks: cleanMiniappText(draftInput.primaryBottlenecks, 3000),
      nextPhaseFocus: cleanMiniappText(draftInput.nextPhaseFocus, 3000),
      suggestedPracticeLoad: cleanMiniappText(draftInput.suggestedPracticeLoad, 1500),
    };
    if (submit && draft.overallSummary.length < 10) return bad("Please complete the overall summary before submitting");
    await prisma.midtermReport.update({ where: { id }, data: { reportJson: draft as any, reportPeriodLabel: cleanMiniappText((body as any)?.reportPeriodLabel, 120) || null, status: submit ? "SUBMITTED" : report.status, submittedAt: submit ? new Date() : report.submittedAt } });
  } else if (kind === "FINAL") {
    const report = await prisma.finalReport.findFirst({ where: { id, teacherId: access.teacherId }, select: { id: true, status: true, submittedAt: true, archivedAt: true, reportJson: true } });
    if (!report) return bad("Report not found", 404);
    if (!isReportEditable(report.status, report.archivedAt) || report.status === "FORWARDED") return bad("Report is read only", 409);
    const current = parseFinalReportDraft(report.reportJson);
    const recommendation = cleanMiniappText(draftInput.recommendedNextStep, 40).toUpperCase();
    const draft = parseFinalReportDraft({
      ...current,
      finalSummary: cleanMiniappText(draftInput.finalSummary, 4000),
      strengths: cleanMiniappText(draftInput.strengths, 3000),
      areasToContinue: cleanMiniappText(draftInput.areasToContinue, 3000),
      parentNote: cleanMiniappText(draftInput.parentNote, 3000),
      teacherComment: cleanMiniappText(draftInput.teacherComment, 3000),
      recommendedNextStep: FINAL_REPORT_RECOMMENDATIONS.includes(recommendation as any) ? recommendation : "",
    });
    if (submit && draft.finalSummary.length < 10) return bad("Please complete the final summary before submitting");
    await prisma.finalReport.update({ where: { id }, data: { reportJson: draft as any, reportPeriodLabel: cleanMiniappText((body as any)?.reportPeriodLabel, 120) || null, recommendation: draft.recommendedNextStep || null, status: submit ? "SUBMITTED" : report.status, submittedAt: submit ? new Date() : report.submittedAt } });
  } else {
    return bad("Unknown report type");
  }
  await logAudit({ actor: access.user, module: "teacher-reports", action: submit ? "SUBMIT_MINIAPP" : "SAVE_DRAFT_MINIAPP", entityType: kind === "FINAL" ? "FinalReport" : "MidtermReport", entityId: id });
  return ok({ completed: true, submitted: submit });
}
