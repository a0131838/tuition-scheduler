import type { SchoolGuideAssessmentSession } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assessmentInternalQuestion,
  publicQuestion,
  sha256,
  type AcademicAssessmentStoredAnswer,
} from "@/lib/school-guide-academic-assessment";

export const ITEP_SECTION_META_KEY = "__ITEP_SECTION_META__";

function questionAnswered(value: AcademicAssessmentStoredAnswer | undefined) {
  return Boolean(value?.value);
}

function itepSectionState(session: SchoolGuideAssessmentSession, selected: string | null, answers: Record<string, AcademicAssessmentStoredAnswer>) {
  if (session.targetPath !== "INTERNATIONAL_ENGLISH" || !selected) return null;
  const current = assessmentInternalQuestion(session.formId, selected);
  if (!current.section || !current.sectionDurationMinutes) return null;
  const ids = idsFromJson(session.questionIds);
  const sectionIds = ids.filter((id) => assessmentInternalQuestion(session.formId, id).section === current.section);
  const meta = answers[ITEP_SECTION_META_KEY];
  const startedAt = meta?.sectionStartedAt?.[current.section] || session.startedAt.toISOString();
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const totalSeconds = current.sectionDurationMinutes * 60;
  return {
    key: current.section,
    label: current.sectionLabel,
    part: current.sectionPart,
    durationMinutes: current.sectionDurationMinutes,
    instructions: current.sectionInstructions,
    answered: sectionIds.filter((id) => questionAnswered(answers[id])).length,
    total: sectionIds.length,
    remainingSeconds: Math.max(0, totalSeconds - elapsedSeconds),
    expired: elapsedSeconds >= totalSeconds,
  };
}

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
  const firstUnanswered = questionIds.find((id) => !questionAnswered(answers[id]));
  const selected = preferredQuestionId && questionIds.includes(preferredQuestionId)
    ? preferredQuestionId
    : firstUnanswered || questionIds[questionIds.length - 1] || null;
  const question = selected ? publicQuestion(session.formId, selected) : null;
  const answeredCount = questionIds.filter((id) => questionAnswered(answers[id])).length;
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
    currentAnswer: selected && answers[selected]?.value !== "__TIME_EXPIRED__" ? answers[selected]?.value ?? "" : "",
    section: itepSectionState(session, selected, answers),
    canSubmit: questionIds.length > 0 && answeredCount === questionIds.length,
    confidence: session.confidence,
    domainScores: session.domainScores,
    overallScore: session.overallScore,
    overallBand: session.overallBand,
    report: safeReport,
    notice: "内部受控试测；结果不等于学校、MOE或AEIS官方成绩及录取结论。",
  };
}
