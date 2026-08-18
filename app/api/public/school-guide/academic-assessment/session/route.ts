import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  anchorCorrectCount,
  calculateAssessmentResult,
  assessmentInternalQuestion,
  fullQuestionIds,
  initialQuestionIds,
  resolveRoute,
  scoreAnswer,
} from "@/lib/school-guide-academic-assessment";
import { gradeAcademicWriting } from "@/lib/school-guide-assessment-ai-grader";
import { answersFromJson, cleanText, idsFromJson, ITEP_SECTION_META_KEY, publicSessionView, sessionByToken } from "../_lib";

function ensureSectionStarted(answers: ReturnType<typeof answersFromJson>, formId: string, questionId: string | null) {
  if (!questionId) return;
  const section = assessmentInternalQuestion(formId, questionId).section;
  if (!section) return;
  const meta = answers[ITEP_SECTION_META_KEY] ?? {
    value: "", durationSeconds: 0, updatedAt: new Date().toISOString(), autoScore: null, sectionStartedAt: {},
  };
  meta.sectionStartedAt = meta.sectionStartedAt ?? {};
  meta.sectionStartedAt[section] = meta.sectionStartedAt[section] || new Date().toISOString();
  meta.updatedAt = new Date().toISOString();
  answers[ITEP_SECTION_META_KEY] = meta;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const session = await sessionByToken(body?.sessionToken);
  if (!session) return NextResponse.json({ ok: false, message: "测评记录不存在或凭证无效。" }, { status: 401 });
  const action = cleanText(body?.action, 20) || "load";
  if (action === "load") return NextResponse.json({ ok: true, session: publicSessionView(session) });
  if (["COMPLETED", "AWAITING_REVIEW"].includes(session.status)) {
    return NextResponse.json({ ok: true, session: publicSessionView(session) });
  }

  if (action === "expire_section") {
    if (session.targetPath !== "INTERNATIONAL_ENGLISH") return NextResponse.json({ ok: false, message: "当前测评不使用分区计时。" }, { status: 400 });
    const ids = idsFromJson(session.questionIds);
    const answers = answersFromJson(session.answers);
    const currentId = ids.find((id) => !answers[id]?.value) || null;
    if (!currentId) return NextResponse.json({ ok: true, session: publicSessionView(session) });
    const section = assessmentInternalQuestion(session.formId, currentId).section;
    for (const id of ids) {
      const question = assessmentInternalQuestion(session.formId, id);
      if (question.section === section && !answers[id]?.value) {
        answers[id] = {
          value: "__TIME_EXPIRED__",
          durationSeconds: 0,
          updatedAt: new Date().toISOString(),
          autoScore: question.requiresReviewer ? null : 0,
          ...(question.requiresReviewer ? { manualScore: 0, reviewerNote: "本区超时，未提交作答。" } : {}),
        };
      }
    }
    const nextId = ids.find((id) => !answers[id]?.value) || currentId;
    ensureSectionStarted(answers, session.formId, nextId);
    const answeredCount = ids.filter((id) => Boolean(answers[id]?.value)).length;
    const updated = await prisma.schoolGuideAssessmentSession.update({
      where: { id: session.id },
      data: { answers, currentQuestionId: nextId, lastActiveAt: new Date(), completionRate: ids.length ? answeredCount / ids.length : 0, status: answeredCount === ids.length ? "READY_TO_SUBMIT" : "IN_PROGRESS" },
    });
    await prisma.auditLog.create({ data: { actorEmail: "public-assessment@system.local", actorName: session.studentCode, actorRole: "PUBLIC", module: "SCHOOL_GUIDE_ASSESSMENT", action: "SECTION_TIMEOUT", entityType: "SchoolGuideAssessmentSession", entityId: session.id, meta: { section, answeredCount, totalQuestions: ids.length } } });
    return NextResponse.json({ ok: true, message: `${assessmentInternalQuestion(session.formId, currentId).sectionLabel || "当前部分"}时间已到，已进入下一部分。`, session: publicSessionView(updated, nextId) });
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
    const anchors = initialQuestionIds(session.formId, session.targetPath);
    if (!route && anchors.length === 6 && anchors.every((id) => Boolean(answers[id]?.value))) {
      route = resolveRoute(anchorCorrectCount(session.formId, answers));
      questionIds = fullQuestionIds(session.formId, route, session.targetPath);
    }
    const nextId = questionIds.find((id) => !answers[id]?.value) || questionId;
    ensureSectionStarted(answers, session.formId, nextId);
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
    const aiGrades: Array<{ questionId: string; accepted: boolean; confidence?: string }> = [];
    for (const questionId of ids) {
      const question = assessmentInternalQuestion(session.formId, questionId);
      if (!question.requiresReviewer || answers[questionId]?.manualScore != null) continue;
      const grade = await gradeAcademicWriting({
        questionId,
        product: session.targetPath,
        ageBand: session.ageBand,
        prompt: question.prompt,
        answer: answers[questionId].value,
        rubric: ("rubric" in question ? question.rubric : "") || question.answerRule || "按任务、内容、结构、词汇和语法评分。",
        maxScore: question.maxScore,
      });
      if (grade?.accepted && grade.score != null) {
        answers[questionId].manualScore = Number(grade.score);
        answers[questionId].reviewerNote = [grade.strength, grade.priority].filter(Boolean).join("；");
        answers[questionId].aiReview = { confidence: grade.confidence, criteria: grade.criteria, modelRegion: grade.modelRegion };
      }
      aiGrades.push({ questionId, accepted: Boolean(grade?.accepted), confidence: grade?.confidence });
    }
    const result = calculateAssessmentResult({
      formId: session.formId,
      questionIds: ids,
      answers,
      durationSeconds: session.durationSeconds,
      targetPath: session.targetPath,
    });
    const previous = await prisma.schoolGuideAssessmentSession.findFirst({
      where: { id: { not: session.id }, studentNickname: session.studentNickname, ageBand: session.ageBand, targetPath: session.targetPath, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true, formVariant: true, report: true },
    });
    const previousReport = previous?.report && typeof previous.report === "object" && !Array.isArray(previous.report) ? previous.report as Record<string, unknown> : null;
    const priorSkills = previousReport?.skillScores && typeof previousReport.skillScores === "object" && !Array.isArray(previousReport.skillScores) ? previousReport.skillScores as Record<string, number> : {};
    const currentSkills = result.report.skillScores as Record<string, number>;
    const comparison = previous ? {
      previousCompletedAt: previous.completedAt,
      previousFormVariant: previous.formVariant,
      skillDeltas: Object.fromEntries(Object.entries(currentSkills).map(([name, score]) => [name, priorSkills[name] == null ? null : score - Number(priorSkills[name])])),
    } : null;
    const report = { ...result.report, comparison, aiWritingReview: { attempted: aiGrades.length, accepted: aiGrades.filter((item) => item.accepted).length } };
    const status = result.pendingManual > 0 ? "AWAITING_REVIEW" : "COMPLETED";
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.schoolGuideAssessmentSession.update({
        where: { id: session.id },
        data: {
          status,
          answers,
          submittedAt: new Date(),
          completedAt: status === "COMPLETED" ? new Date() : null,
          completionRate: result.completionRate,
          confidence: result.confidence,
          domainScores: result.domainScores,
          overallScore: status === "COMPLETED" ? result.overallScore : null,
          overallBand: status === "COMPLETED" ? result.overallBand : null,
          report,
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
          meta: { status, pendingManual: result.pendingManual, completionRate: result.completionRate, aiGrades },
        },
      });
      const accessCode = await tx.schoolGuideAssessmentCode.findUnique({ where: { id: session.accessCodeId }, select: { assessmentRequestId: true } });
      if (accessCode?.assessmentRequestId) {
        await tx.schoolGuideAssessmentRequest.update({
          where: { id: accessCode.assessmentRequestId },
          data: {
            status: status === "COMPLETED" ? "REPORT_READY" : "AWAITING_REVIEW",
            submittedAt: new Date(),
            reviewedAt: status === "COMPLETED" ? new Date() : null,
          },
        });
      }
      return row;
    });
    return NextResponse.json({ ok: true, message: status === "AWAITING_REVIEW" ? "已提交；AI评分分歧或暂不可用，已转老师复核。" : "测评已完成，写作已由双重AI评分并通过一致性检查。", session: publicSessionView(updated) });
  }

  return NextResponse.json({ ok: false, message: "不支持的操作。" }, { status: 400 });
}
