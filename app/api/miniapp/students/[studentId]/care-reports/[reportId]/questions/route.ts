import { createParentCareQuestion, markParentCareQuestionRead, parentQuestionStatusLabel } from "@/lib/care-operations";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getParentCareReport } from "@/lib/parent-care-reports";
import { logParentPortalAudit } from "@/lib/parent-portal";
import { prisma } from "@/lib/prisma";
import { bad, ok, requireMiniappStudentAccess } from "../../../../../_lib";

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string; reportId: string }> }) {
  const { studentId, reportId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewReports");
  if (!auth.ok) return auth.response;
  const report = await getParentCareReport(reportId, studentId);
  if (!report) return bad("Report not found", 404);

  const questions = await prisma.careParentQuestion.findMany({
    where: { reportId, studentId, parentId: auth.parent.id },
    select: { id: true, question: true, response: true, status: true, createdAt: true, respondedAt: true, parentViewedResponseAt: true },
    orderBy: { createdAt: "asc" },
  });
  await Promise.all(questions.filter((item) => item.status === "ANSWERED" && !item.parentViewedResponseAt).map((item) => markParentCareQuestionRead({ parentId: auth.parent.id, studentId, questionId: item.id })));
  return ok({
    items: questions.map((item) => ({
      id: item.id,
      question: item.question,
      response: item.response,
      status: item.status,
      statusText: parentQuestionStatusLabel(item.status),
      createdAtText: formatBusinessDateTime(item.createdAt),
      respondedAtText: item.respondedAt ? formatBusinessDateTime(item.respondedAt) : null,
    })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ studentId: string; reportId: string }> }) {
  const { studentId, reportId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewReports");
  if (!auth.ok) return auth.response;
  let body: { question?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request", 400);
  }
  try {
    const question = await createParentCareQuestion({ parentId: auth.parent.id, studentId, reportId, question: body.question });
    await logParentPortalAudit({ parentId: auth.parent.id, studentId, action: "ASK_CARE_REPORT_QUESTION", targetType: "CareParentQuestion", targetId: question.id });
    return ok({ id: question.id, status: question.status });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Question failed", 400);
  }
}
