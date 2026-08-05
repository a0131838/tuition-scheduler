import { NextResponse } from "next/server";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { prisma } from "@/lib/prisma";
import {
  assessmentInternalQuestion,
  calculateAssessmentResult,
  manualQuestionIds,
} from "@/lib/school-guide-academic-assessment";
import { answersFromJson, idsFromJson } from "@/app/api/public/school-guide/academic-assessment/_lib";

function canAccess(role: string) {
  return ["ADMIN", "CS", "SALES", "TEACHER"].includes(role);
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canAccess(auth.user.role)) return NextResponse.json({ ok: false, message: "没有评估工作台权限。" }, { status: 403 });
  const { id } = await context.params;
  const session = await prisma.schoolGuideAssessmentSession.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ ok: false, message: "测评不存在。" }, { status: 404 });
  const ids = idsFromJson(session.questionIds);
  const answers = answersFromJson(session.answers);
  const questions = ids.map((questionId, index) => ({
    index: index + 1,
    ...assessmentInternalQuestion(session.formId, questionId),
    studentAnswer: answers[questionId]?.value ?? "",
    autoScore: answers[questionId]?.autoScore ?? null,
    manualScore: answers[questionId]?.manualScore ?? null,
    reviewerNote: answers[questionId]?.reviewerNote ?? null,
  }));
  return NextResponse.json({
    ok: true,
    capabilities: { canReview: ["ADMIN", "TEACHER"].includes(auth.user.role) },
    session: {
      id: session.id,
      studentCode: session.studentCode,
      studentNickname: session.studentNickname,
      ageBand: session.ageBand,
      targetPath: session.targetPath,
      formVariant: session.formVariant,
      bankVersion: session.bankVersion,
      route: session.route,
      status: session.status,
      durationSeconds: session.durationSeconds,
      confidence: session.confidence,
      domainScores: session.domainScores,
      overallScore: session.overallScore,
      overallBand: session.overallBand,
      report: session.report,
      reviewerNote: session.reviewerNote,
      submittedAt: session.submittedAt,
      reviewedAt: session.reviewedAt,
      questions,
    },
  });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!["ADMIN", "TEACHER"].includes(auth.user.role)) return NextResponse.json({ ok: false, message: "只有老师或管理可以提交评分。" }, { status: 403 });
  const { id } = await context.params;
  const session = await prisma.schoolGuideAssessmentSession.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ ok: false, message: "测评不存在。" }, { status: 404 });
  if (!session.submittedAt) return NextResponse.json({ ok: false, message: "学生尚未提交测评。" }, { status: 409 });
  const body = await req.json().catch(() => null);
  const answers = answersFromJson(session.answers);
  const ids = idsFromJson(session.questionIds);
  const manualIds = manualQuestionIds(session.formId, ids);
  const scores = body?.scores && typeof body.scores === "object" ? body.scores as Record<string, { score?: unknown; note?: unknown }> : {};
  for (const questionId of manualIds) {
    const question = assessmentInternalQuestion(session.formId, questionId);
    const value = Number(scores[questionId]?.score);
    if (!Number.isFinite(value) || value < 0 || value > question.maxScore) {
      return NextResponse.json({ ok: false, message: `请完整评分：第${ids.indexOf(questionId) + 1}题需填写0–${question.maxScore}分。` }, { status: 400 });
    }
    answers[questionId] = {
      ...answers[questionId],
      manualScore: value,
      reviewerNote: String(scores[questionId]?.note ?? "").trim().slice(0, 500) || null,
    };
  }
  const result = calculateAssessmentResult({ formId: session.formId, questionIds: ids, answers, durationSeconds: session.durationSeconds, targetPath: session.targetPath });
  const reviewerNote = String(body?.reviewerNote ?? "").trim().slice(0, 1200);
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.schoolGuideAssessmentSession.update({
      where: { id },
      data: {
        answers,
        status: "COMPLETED",
        completedAt: new Date(),
        confidence: result.confidence,
        completionRate: result.completionRate,
        domainScores: result.domainScores,
        overallScore: result.overallScore,
        overallBand: result.overallBand,
        report: result.report,
        reviewerNote: reviewerNote || null,
        reviewedByUserId: auth.user.id,
        reviewedByName: auth.user.name,
        reviewedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        actorEmail: auth.user.email,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        module: "SCHOOL_GUIDE_ASSESSMENT",
        action: session.status === "COMPLETED" ? "REVIEW_CORRECT" : "REVIEW_COMPLETE",
        entityType: "SchoolGuideAssessmentSession",
        entityId: id,
        meta: { studentCode: session.studentCode, manualQuestionCount: manualIds.length, overallScore: result.overallScore, overallBand: result.overallBand, confidence: result.confidence },
      },
    });
    const accessCode = await tx.schoolGuideAssessmentCode.findUnique({ where: { id: session.accessCodeId }, select: { assessmentRequestId: true } });
    if (accessCode?.assessmentRequestId) {
      await tx.schoolGuideAssessmentRequest.update({
        where: { id: accessCode.assessmentRequestId },
        data: { status: "REPORT_READY", reviewedAt: new Date() },
      });
    }
    return row;
  });
  return NextResponse.json({ ok: true, message: "评分已保存，家长端现在可以查看完整测评报告。", session: { id: updated.id, status: updated.status, overallScore: updated.overallScore, overallBand: updated.overallBand } });
}
