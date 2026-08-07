import type { SchoolGuideAssessmentSession } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  publicQuestion,
  sha256,
  type AcademicAssessmentStoredAnswer,
} from "@/lib/school-guide-academic-assessment";

export function cleanText(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

export function answersFromJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, AcademicAssessmentStoredAnswer>;
  return value as Record<string, AcademicAssessmentStoredAnswer>;
}

export function idsFromJson(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export async function sessionByToken(token: unknown) {
  const clean = cleanText(token, 128);
  if (!clean) return null;
  return prisma.schoolGuideAssessmentSession.findUnique({ where: { sessionTokenHash: sha256(clean) } });
}

export function publicSessionView(session: SchoolGuideAssessmentSession, preferredQuestionId?: string | null) {
  const questionIds = idsFromJson(session.questionIds);
  const answers = answersFromJson(session.answers);
  const firstUnanswered = questionIds.find((id) => !answers[id]?.value);
  const selected = preferredQuestionId && questionIds.includes(preferredQuestionId)
    ? preferredQuestionId
    : firstUnanswered || questionIds[questionIds.length - 1] || null;
  const question = selected ? publicQuestion(session.formId, selected) : null;
  const answeredCount = questionIds.filter((id) => Boolean(answers[id]?.value)).length;
  const currentIndex = selected ? questionIds.indexOf(selected) : -1;
  const safeReport = session.report && typeof session.report === "object" ? session.report : null;
  const retestBase = session.completedAt || session.submittedAt || session.startedAt;
  const retestRecommendedAt = new Date(retestBase.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    studentCode: session.studentCode,
    studentNickname: session.studentNickname,
    ageBand: session.ageBand,
    targetPath: session.targetPath,
    formVariant: session.formVariant,
    bankVersion: session.bankVersion,
    route: session.route,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    retestRecommendedAt,
    answeredCount,
    totalQuestions: questionIds.length,
    progressPercent: questionIds.length ? Math.round((answeredCount / questionIds.length) * 100) : 0,
    currentIndex,
    question,
    currentAnswer: selected ? answers[selected]?.value ?? "" : "",
    canSubmit: questionIds.length > 0 && answeredCount === questionIds.length,
    confidence: session.confidence,
    domainScores: session.domainScores,
    overallScore: session.overallScore,
    overallBand: session.overallBand,
    report: safeReport,
    notice: "内部受控试测；结果不等于学校、MOE或AEIS官方成绩及录取结论。",
  };
}
