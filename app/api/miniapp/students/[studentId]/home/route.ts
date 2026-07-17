import { academicRiskLabel, servicePlanLabel } from "@/lib/academic-management";
import { formatBusinessDateOnly } from "@/lib/date-only";
import { parseParentFeedbackSections } from "@/lib/parent-feedback-format";
import { listParentBillingForPackage } from "@/lib/student-parent-billing";
import { prisma } from "@/lib/prisma";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";
import { bad, ok, requireMiniappStudentAccess, sessionDto } from "../../../_lib";

function summarizeFeedback(content: string) {
  const sections = parseParentFeedbackSections(content);
  const preferred = sections.classPerformance || sections.lessonFocus || content;
  const text = String(preferred ?? "").replace(/\s+/g, " ").trim();
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId);
  if (!auth.ok) return auth.response;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      servicePlanType: true,
      academicRiskLevel: true,
      nextAction: true,
      nextActionDue: true,
    },
  });
  if (!student) return bad("Student not found", 404);

  const now = new Date();
  const [nextSession, latestFeedbackSession, packages, openRequestCount] = await Promise.all([
    auth.link.canViewSchedule ? prisma.session.findFirst({
      where: {
        startAt: { gte: now },
        ...sessionBelongsToStudentWhere(studentId),
      },
      include: {
        teacher: true,
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
        attendances: { where: { studentId }, take: 1 },
      },
      orderBy: { startAt: "asc" },
    }) : Promise.resolve(null),
    auth.link.canViewFeedback ? prisma.session.findFirst({
      where: {
        startAt: { lte: now },
        feedbacks: { some: { content: { not: "" } } },
        ...sessionBelongsToStudentWhere(studentId),
      },
      include: {
        feedbacks: {
          where: { content: { not: "" } },
          include: { teacher: { select: { name: true } } },
          orderBy: { submittedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { startAt: "desc" },
    }) : Promise.resolve(null),
    auth.link.canViewFinance ? prisma.coursePackage.findMany({
      where: { studentId, status: "ACTIVE" },
      select: { id: true, remainingMinutes: true, paidAmount: true },
      take: 50,
    }) : Promise.resolve([]),
    auth.link.canCreateRequests ? prisma.ticket.count({
      where: {
        studentId,
        isArchived: false,
        status: { notIn: ["Completed", "Cancelled", "Closed", "已完成", "已关闭"] },
      },
    }) : Promise.resolve(0),
  ]);

  const billing = await Promise.all(packages.map((pkg) => listParentBillingForPackage(pkg.id)));
  const invoiceCount = billing.reduce((sum, item) => sum + item.invoices.length, 0);
  const receiptCount = billing.reduce((sum, item) => sum + item.receipts.length, 0);
  const totalRemainingMinutes = packages.reduce((sum, pkg) => sum + (pkg.remainingMinutes ?? 0), 0);
  const latestFeedback = latestFeedbackSession?.feedbacks[0] ?? null;

  return ok({
    student: {
      id: student.id,
      name: student.name,
      school: student.school,
      grade: student.grade,
      servicePlanType: student.servicePlanType || "STANDARD_COURSE",
      servicePlanLabel: servicePlanLabel(student.servicePlanType || "STANDARD_COURSE"),
      academicRiskLevel: auth.link.canViewReports ? student.academicRiskLevel : null,
      academicRiskLabel: auth.link.canViewReports ? academicRiskLabel(student.academicRiskLevel) : null,
      nextAction: auth.link.canViewReports ? student.nextAction : null,
      nextActionDue: auth.link.canViewReports && student.nextActionDue ? formatBusinessDateOnly(student.nextActionDue) : null,
    },
    nextSession: nextSession ? sessionDto(nextSession, nextSession.attendances[0]) : null,
    latestFeedback: latestFeedback
      ? {
          id: latestFeedback.id,
          sessionStartAt: latestFeedbackSession!.startAt.toISOString(),
          teacherName: latestFeedback.teacher.name,
          summary: summarizeFeedback(latestFeedback.content),
        }
      : null,
    financeSummary: {
      activePackageCount: packages.length,
      totalRemainingMinutes,
      invoiceCount,
      receiptCount,
    },
    requestSummary: {
      openCount: openRequestCount,
    },
    permissions: {
      canViewSchedule: auth.link.canViewSchedule,
      canViewFeedback: auth.link.canViewFeedback,
      canViewFinance: auth.link.canViewFinance,
      canViewReports: auth.link.canViewReports,
      canCreateRequests: auth.link.canCreateRequests,
    },
  });
}
