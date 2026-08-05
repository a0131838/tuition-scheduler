import crypto from "crypto";
import bankSource from "@/lib/school-guide-academic-assessment-bank.generated.json";

type BankRow = Record<string, string | number | null>;
type StoredAnswer = {
  value: string;
  durationSeconds: number;
  updatedAt: string;
  autoScore: number | null;
  manualScore?: number | null;
  reviewerNote?: string | null;
};

const bank = bankSource as unknown as {
  version: string;
  releaseStatus: string;
  forms: BankRow[];
  assignments: BankRow[];
  questions: BankRow[];
  pathAssignments: BankRow[];
};

export const ACADEMIC_ASSESSMENT_VERSION = bank.version;
export const ACADEMIC_ASSESSMENT_STATUS = bank.releaseStatus;
export const ACADEMIC_ASSESSMENT_AGE_BANDS = ["3–5岁", "6–8岁", "9–11岁", "12–14岁", "15–17岁"] as const;
export const ACADEMIC_ASSESSMENT_PATHS = ["UNSURE", "INTERNATIONAL", "MOE_AEIS", "DSA"] as const;

const AGE_FORM_CODE: Record<string, string> = {
  "3–5岁": "A35",
  "6–8岁": "A68",
  "9–11岁": "A911",
  "12–14岁": "A1214",
  "15–17岁": "A1517",
};

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function normalizeAssessmentCode(value: unknown) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export function generateAssessmentCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let raw = "SG";
  for (let index = 0; index < 6; index += 1) raw += alphabet[bytes[index] % alphabet.length];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function generateStudentCode() {
  return `STU-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function formIdsForAge(ageBand: string) {
  const ageCode = AGE_FORM_CODE[ageBand];
  if (!ageCode) return [];
  return ["A", "B", "C"].map((variant) => `CORE-${ageCode}-${variant}`);
}

export function chooseLeastUsedForm(ageBand: string, counts: Record<string, number>, excludedFormIds: string[] = []) {
  const forms = formIdsForAge(ageBand).filter((formId) => !excludedFormIds.includes(formId));
  if (!forms.length) throw new Error("INVALID_AGE_BAND");
  return forms.sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0) || a.localeCompare(b))[0];
}

function pathLabel(path: string) {
  if (path === "INTERNATIONAL") return "国际学校";
  if (path === "MOE_AEIS") return "政府学校/AEIS";
  if (path === "DSA") return "DSA/面试/作品集";
  return "";
}

function assignmentForQuestion(formId: string, questionId: string) {
  const core = bank.assignments.find((row) => row.form_id === formId && row.question_id === questionId);
  if (core) return core;
  const form = bank.forms.find((row) => row.form_id === formId);
  return bank.pathAssignments.find((row) =>
    row.question_id === questionId && row["年龄"] === form?.["年龄"] && row["卷型"] === form?.["卷型"],
  );
}

export function initialQuestionIds(formId: string) {
  const rows = bank.assignments.filter((row) => row.form_id === formId);
  const hasAnchors = rows.some((row) => row["阶段"] === "定位锚题");
  return rows
    .filter((row) => hasAnchors ? row["阶段"] === "定位锚题" : row["阶段"] === "共同任务")
    .sort((a, b) => Number(a["顺序"]) - Number(b["顺序"]))
    .map((row) => String(row.question_id));
}

export function resolveRoute(anchorCorrect: number) {
  if (anchorCorrect <= 2) return "easy";
  if (anchorCorrect <= 4) return "standard";
  return "hard";
}

export function fullQuestionIds(formId: string, route: string | null, targetPath: string) {
  const rows = bank.assignments.filter((row) => row.form_id === formId);
  const form = bank.forms.find((row) => row.form_id === formId);
  if (!form) throw new Error("FORM_NOT_FOUND");
  if (form["模式"] === "观察式") {
    return rows.sort((a, b) => Number(a["顺序"]) - Number(b["顺序"])).map((row) => String(row.question_id));
  }

  const base = rows.filter((row) => ["定位锚题", "共同核心"].includes(String(row["阶段"])));
  if (targetPath === "DSA") {
    const dsa = bank.pathAssignments.filter((row) =>
      String(row["目标路径"]).includes("DSA") && row["年龄"] === form["年龄"] && row["卷型"] === form["卷型"],
    );
    if (dsa.length === 4) {
      return [
        ...base.sort((a, b) => Number(a["顺序"]) - Number(b["顺序"])),
        ...dsa.sort((a, b) => Number(a["顺序"]) - Number(b["顺序"])),
      ].map((row) => String(row.question_id));
    }
  }

  const routeNeedle = route === "easy" ? "基础分支" : route === "hard" ? "进阶分支" : "标准分支";
  const selected = rows.filter((row) => row["阶段"] === "难度分支" && String(row["适用路径"]).startsWith(routeNeedle));
  const open = rows.filter((row) => row["阶段"] === "开放任务");
  return [...base, ...selected, ...open]
    .sort((a, b) => Number(a["顺序"]) - Number(b["顺序"]))
    .map((row) => String(row.question_id));
}

function parseQuestionContent(content: string) {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const options: Array<{ key: string; text: string }> = [];
  const prompt: string[] = [];
  for (const line of lines) {
    const match = line.match(/^([A-D])[\.、\)]\s*(.+)$/i);
    if (match) options.push({ key: match[1].toUpperCase(), text: match[2] });
    else prompt.push(line);
  }
  return { prompt: prompt.join("\n"), options };
}

function isManualRule(type: string, answerRule: string) {
  if (["observation", "extended_response", "oral_response"].includes(type)) return true;
  const numeric = answerRule.replace(/[^\d.-]/g, "");
  if (type === "short_answer" && (!/\d/.test(numeric) || !Number.isFinite(Number(numeric)))) return true;
  return /人工|观察|接受|合理|指出|示例/.test(answerRule);
}

export function publicQuestion(formId: string, questionId: string) {
  const row = assignmentForQuestion(formId, questionId);
  if (!row) throw new Error("QUESTION_NOT_FOUND");
  const type = String(row["题型"] ?? "short_answer");
  const content = String(row["学生看到的完整内容"] ?? row["学生内容"] ?? "");
  const parsed = parseQuestionContent(content);
  const answerRule = String(row["答案/评分方式"] ?? "");
  return {
    id: questionId,
    stage: String(row["阶段"] ?? "路径任务"),
    domain: String(row["能力域"] ?? "综合能力"),
    type,
    prompt: parsed.prompt,
    options: parsed.options,
    expectedMinutes: Number(row["预计分钟"] ?? 1),
    requiresReviewer: isManualRule(type, answerRule),
  };
}

function normalizedAnswer(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/[\s，,。]/g, "");
}

export function scoreAnswer(formId: string, questionId: string, value: unknown) {
  const row = assignmentForQuestion(formId, questionId);
  if (!row) throw new Error("QUESTION_NOT_FOUND");
  const type = String(row["题型"] ?? "");
  const expected = String(row["答案/评分方式"] ?? "").trim();
  if (isManualRule(type, expected)) return null;
  if (type === "single_choice") return normalizedAnswer(value) === normalizedAnswer(expected) ? Number(row["分值"] ?? 5) : 0;
  const actualNumber = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  const expectedNumber = Number(expected.replace(/[^\d.-]/g, ""));
  if (Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)) {
    return Math.abs(actualNumber - expectedNumber) < 0.011 ? Number(row["分值"] ?? 5) : 0;
  }
  return normalizedAnswer(value) === normalizedAnswer(expected) ? Number(row["分值"] ?? 5) : 0;
}

export function anchorCorrectCount(formId: string, answers: Record<string, StoredAnswer>) {
  const anchorIds = bank.assignments
    .filter((row) => row.form_id === formId && row["阶段"] === "定位锚题")
    .map((row) => String(row.question_id));
  return anchorIds.filter((id) => (answers[id]?.autoScore ?? 0) > 0).length;
}

export function manualQuestionIds(formId: string, questionIds: string[]) {
  return questionIds.filter((id) => publicQuestion(formId, id).requiresReviewer);
}

export function assessmentInternalQuestion(formId: string, questionId: string) {
  const row = assignmentForQuestion(formId, questionId);
  if (!row) throw new Error("QUESTION_NOT_FOUND");
  return {
    ...publicQuestion(formId, questionId),
    answerRule: String(row["答案/评分方式"] ?? ""),
    explanation: String(row["解析"] ?? ""),
    rubricId: String(row.rubric_id ?? ""),
    maxScore: Number(row["分值"] ?? 5),
  };
}

export function calculateAssessmentResult(input: {
  formId: string;
  questionIds: string[];
  answers: Record<string, StoredAnswer>;
  durationSeconds: number;
  targetPath: string;
}) {
  const domains: Record<string, { score: number; max: number }> = {};
  let answered = 0;
  let pendingManual = 0;
  for (const id of input.questionIds) {
    const question = assessmentInternalQuestion(input.formId, id);
    const answer = input.answers[id];
    if (answer?.value) answered += 1;
    const score = answer?.manualScore ?? answer?.autoScore;
    if (question.requiresReviewer && answer?.manualScore == null) pendingManual += 1;
    const bucket = domains[question.domain] ?? { score: 0, max: 0 };
    bucket.max += question.maxScore;
    bucket.score += typeof score === "number" ? Math.max(0, Math.min(question.maxScore, score)) : 0;
    domains[question.domain] = bucket;
  }
  const completionRate = input.questionIds.length ? answered / input.questionIds.length : 0;
  const domainScores = Object.fromEntries(Object.entries(domains).map(([name, value]) => [name, Math.round((value.score / value.max) * 100)]));
  const values = Object.values(domainScores);
  const overallScore = values.length ? Math.round(values.reduce((sum, score) => sum + score, 0) / values.length) : 0;
  const overallBand = overallScore < 40 ? "基础待建立" : overallScore < 55 ? "发展中" : overallScore < 70 ? "接近当前阶段要求" : overallScore < 85 ? "表现稳定" : "表现较强";
  const minutes = input.durationSeconds / 60;
  const confidence = pendingManual > 0 ? "待人工" : completionRate < 0.75 ? "低" : completionRate >= 0.9 && minutes >= 24 && minutes <= 54 ? "高" : "中";
  const ranked = Object.entries(domainScores).sort((a, b) => b[1] - a[1]);
  const strengths = ranked.slice(0, 3).map(([name, score]) => `${name}：本次内部任务得分 ${score}`);
  const priorities = [...ranked].reverse().slice(0, 3).map(([name, score]) => `${name}：建议优先复核与训练（本次 ${score}）`);
  return {
    completionRate,
    pendingManual,
    domainScores,
    overallScore,
    overallBand,
    confidence,
    report: {
      standard: "博思内部入学准备度标准，不是学校、MOE、AEIS官方分数、百分位或录取预测。",
      strengths,
      priorities,
      targetPath: pathLabel(input.targetPath) || "暂未确定",
      nextStep: "建议由顾问与学科老师结合目标学校官方要求，制定8–12周准备计划。",
    },
  };
}

export type AcademicAssessmentStoredAnswer = StoredAnswer;
