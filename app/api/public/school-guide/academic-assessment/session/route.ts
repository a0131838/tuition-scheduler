import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  anchorCorrectCount,
  calculateAssessmentResult,
  fullQuestionIds,
  initialQuestionIds,
  resolveRoute,
  scoreAnswer,
} from "@/lib/school-guide-academic-assessment";
import { answersFromJson, cleanText, idsFromJson, publicSessionView, sessionByToken } from "../_lib";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const session = await sessionByToken(body?.sessionToken);
  if (!session) return NextResponse.json({ ok: false, message: "测评记录不存在或凭证无效。" }, { status: 401 });
  const action = cleanText(body?.action, 20) || "load";
  if (action === "load") return NextResponse.json({ ok: true, session: publicSessionView(session) });
  if (["COMPLETED", "AWAITING_REVIEW"].includes(session.status)) {
    return NextResponse.json({ ok: true, session: publicSessionView(session) });
  }

  if (action === "answer") {
    const questionId = cleanText(body?.questionId, 80);
    const value = cleanText(body?.answer, 8000);
    const ids = idsFromJson(session.questionIds);
    if (!ids.includes(questionId)) return NextResponse.json({ ok: false, message: "当前题目不属于本次测评。" }, { status: 409 });
    if (!value) return NextResponse.json({ ok: false, message: "请先填写或选择答案。" }, { status: 400 });
    const answers = answersFromJson(session.answers);
    const previousSeconds = answers[questionId]?.durationSeconds ?? 0;
    const durationSeconds = Math.max(0, Math.min(900, Number(body?.durationSeconds) || 0));
    answers[questionId] = {
      ...answers[questionId],
      value,
      durationSeconds,
      updatedAt: new Date().toISOString(),
      autoScore: scoreAnswer(session.formId, questionId, value),
    };

    let route = session.route;
    let questionIds = ids;
    const anchors = initialQuestionIds(session.formId);
    if (!route && anchors.length === 6 && anchors.every((id) => Boolean(answers[id]?.value))) {
      route = resolveRoute(anchorCorrectCount(session.formId, answers));
      questionIds = fullQuestionIds(session.formId, route, session.targetPath);
    }
    const nextId = questionIds.find((id) => !answers[id]?.value) || questionId;
    const answeredCount = questionIds.filter((id) => Boolean(answers[id]?.value)).length;
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.schoolGuideAssessmentSession.update({
        where: { id: session.id },
        data: {
          answers,
          questionIds,
          route,
          currentQuestionId: nextId,
          lastActiveAt: new Date(),
          durationSeconds: { increment: Math.max(0, durationSeconds - previousSeconds) },
          completionRate: questionIds.length ? answeredCount / questionIds.length : 0,
          status: answeredCount === questionIds.length ? "READY_TO_SUBMIT" : "IN_PROGRESS",
        },
      });
      await tx.auditLog.create({
        data: {
          actorEmail: "public-assessment@system.local",
          actorName: session.studentCode,
          actorRole: "PUBLIC",
          module: "SCHOOL_GUIDE_ASSESSMENT",
          action: "ANSWER_SAVE",
          entityType: "SchoolGuideAssessmentSession",
          entityId: session.id,
          meta: { questionId, route, answeredCount, totalQuestions: questionIds.length, durationSeconds },
        },
      });
      return row;
    });
    return NextResponse.json({ ok: true, session: publicSessionView(updated, nextId) });
  }

  if (action === "submit") {
    const ids = idsFromJson(session.questionIds);
    const answers = answersFromJson(session.answers);
    if (ids.some((id) => !answers[id]?.value)) {
      return NextResponse.json({ ok: false, message: "还有题目未完成，请完成后再提交。" }, { status: 409 });
    }
    const result = calculateAssessmentResult({
      formId: session.formId,
      questionIds: ids,
      answers,
      durationSeconds: session.durationSeconds,
      targetPath: session.targetPath,
    });
    const status = result.pendingManual > 0 ? "AWAITING_REVIEW" : "COMPLETED";
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.schoolGuideAssessmentSession.update({
        where: { id: session.id },
        data: {
          status,
          submittedAt: new Date(),
          completedAt: status === "COMPLETED" ? new Date() : null,
          completionRate: result.completionRate,
          confidence: result.confidence,
          domainScores: result.domainScores,
          overallScore: status === "COMPLETED" ? result.overallScore : null,
          overallBand: status === "COMPLETED" ? result.overallBand : null,
          report: result.report,
        },
      });
      await tx.auditLog.create({
        data: {
          actorEmail: "public-assessment@system.local",
          actorName: session.studentCode,
          actorRole: "PUBLIC",
          module: "SCHOOL_GUIDE_ASSESSMENT",
          action: "SUBMIT",
          entityType: "SchoolGuideAssessmentSession",
          entityId: session.id,
          meta: { status, pendingManual: result.pendingManual, completionRate: result.completionRate },
        },
      });
      return row;
    });
    return NextResponse.json({ ok: true, message: status === "AWAITING_REVIEW" ? "已提交，开放任务等待老师评分。" : "测评已完成。", session: publicSessionView(updated) });
  }

  return NextResponse.json({ ok: false, message: "不支持的操作。" }, { status: 400 });
}
