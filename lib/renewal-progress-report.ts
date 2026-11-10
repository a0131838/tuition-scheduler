import { parseFinalReportDraft } from "./final-report";
import type { ParentReportField } from "./learning-report-parent-content";

export const renewalReportFields = [
  { key: "progress", zh: "本阶段学到了什么", en: "Learning progress", sectionZh: "学习进展", sectionEn: "Learning progress" },
  { key: "strengths", zh: "已有进步与优势", en: "Progress and strengths", sectionZh: "学习进展", sectionEn: "Learning progress" },
  { key: "evidence", zh: "具体课堂例子", en: "Specific lesson examples", sectionZh: "学习进展", sectionEn: "Learning progress" },
  { key: "challenges", zh: "仍需加强的地方", en: "Areas to strengthen", sectionZh: "下一阶段怎么学", sectionEn: "Next steps" },
  { key: "nextSteps", zh: "老师建议的下一步", en: "Teacher's next steps", sectionZh: "下一阶段怎么学", sectionEn: "Next steps" },
  { key: "familyNote", zh: "给家长的话", en: "Note to family", sectionZh: "给家长的话", sectionEn: "Note to family" },
] as const;

export function parseRenewalReportDraft(raw: unknown) {
  const object = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return Object.fromEntries(renewalReportFields.map(({ key }) => [key, typeof object[key] === "string" ? String(object[key]).trim() : ""])) as Record<(typeof renewalReportFields)[number]["key"], string>;
}

export function finalDraftToRenewalProgress(raw: unknown) {
  const final = parseFinalReportDraft(raw);
  return {
    progress: [final.finalSummary, final.initialGoals ? `Initial goals / 初始学习目标\n${final.initialGoals}` : ""].filter(Boolean).join("\n\n"),
    strengths: final.strengths,
    evidence: [final.attendanceComment, final.homeworkComment].filter(Boolean).join("\n\n"),
    challenges: final.areasToContinue,
    nextSteps: ({
      CONTINUE_CURRENT: "Continue the current course. / 继续当前课程。",
      MOVE_TO_NEXT_LEVEL: "Move to the next level. / 进入下一阶段。",
      CHANGE_FOCUS: "Adjust the learning focus. / 调整学习方向。",
      PAUSE_AFTER_COMPLETION: "Review the next learning plan after this stage. / 本阶段结束后再确认下一步学习安排。",
      COURSE_COMPLETED: "",
      "": "",
    })[final.recommendedNextStep],
    familyNote: final.parentNote,
  };
}

export function validateRenewalReportDraft(raw: unknown) {
  const draft = parseRenewalReportDraft(raw);
  for (const key of ["progress", "strengths", "evidence", "challenges", "nextSteps"] as const) {
    if (draft[key].length < 10 || draft[key].length > 8000) throw Error("REPORT_FIELDS_REQUIRED");
  }
  if (draft.familyNote.length > 8000) throw Error("REPORT_FIELDS_REQUIRED");
  return draft;
}

export function renewalParentFields(raw: unknown): ParentReportField[] {
  const draft = parseRenewalReportDraft(raw);
  return renewalReportFields.filter(({ key }) => Boolean(draft[key])).map(({ key, zh, en, sectionZh, sectionEn }) => ({
    key, labelZh: zh, labelEn: en, sectionZh, sectionEn, value: draft[key],
  }));
}

export function parseRenewalSnapshot(raw: unknown) {
  const value = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return {
    studentName: typeof value.studentName === "string" ? value.studentName : "",
    teacherName: typeof value.teacherName === "string" ? value.teacherName : "",
    courseName: typeof value.courseName === "string" ? value.courseName : "",
    packageType: value.packageType === "MONTHLY" ? "MONTHLY" : "HOURS",
    validTo: typeof value.validTo === "string" ? value.validTo : null,
    totalMinutes: Math.max(0, Number(value.totalMinutes) || 0),
    remainingMinutes: Math.max(0, Number(value.remainingMinutes) || 0),
    attendedMinutes: Math.max(0, Number(value.attendedMinutes) || 0),
    sessionCount: Math.max(0, Number(value.sessionCount) || 0),
    firstSessionAt: typeof value.firstSessionAt === "string" ? value.firstSessionAt : null,
    lastSessionAt: typeof value.lastSessionAt === "string" ? value.lastSessionAt : null,
    capturedAt: typeof value.capturedAt === "string" ? value.capturedAt : "",
  };
}
