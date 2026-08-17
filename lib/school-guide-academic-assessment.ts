import crypto from "crypto";
import bankSource from "@/lib/school-guide-academic-assessment-bank.generated.json";
import { productQuestionById, productQuestions } from "@/lib/school-guide-product-assessment-bank";

type BankRow = Record<string, string | number | null>;
type StoredAnswer = {
  value: string;
  durationSeconds: number;
  updatedAt: string;
  autoScore: number | null;
  manualScore?: number | null;
  reviewerNote?: string | null;
  aiReview?: { confidence?: string; criteria?: Record<string, number>; modelRegion?: string } | null;
};

const bank = bankSource as unknown as {
  version: string;
  releaseStatus: string;
  forms: BankRow[];
  assignments: BankRow[];
  questions: BankRow[];
  pathAssignments: BankRow[];
};

export const ACADEMIC_ASSESSMENT_VERSION = `${bank.version}-pathway-v4`;
export const ACADEMIC_ASSESSMENT_STATUS = bank.releaseStatus;
export const ACADEMIC_ASSESSMENT_AGE_BANDS = ["3–5岁", "6–8岁", "9–11岁", "12–14岁", "15–17岁"] as const;
export const ACADEMIC_ASSESSMENT_PRODUCTS = ["INTERNATIONAL_ENGLISH", "AEIS_PRIMARY", "AEIS_SECONDARY"] as const;
export const ACADEMIC_ASSESSMENT_LEGACY_PATHS = ["UNSURE", "INTERNATIONAL", "MOE_AEIS", "DSA"] as const;
export const ACADEMIC_ASSESSMENT_PATHS = [...ACADEMIC_ASSESSMENT_PRODUCTS, ...ACADEMIC_ASSESSMENT_LEGACY_PATHS] as const;

type AssessmentProduct = (typeof ACADEMIC_ASSESSMENT_PRODUCTS)[number];

const PRODUCT_DEFINITIONS: Record<AssessmentProduct, {
  title: string;
  allowedAgeBands: string[];
  domains: Array<{ domain: string; objectiveLimit: number; manualLimit: number }>;
}> = {
  INTERNATIONAL_ENGLISH: {
    title: "国际学校英语入学准备度",
    allowedAgeBands: ["6–8岁", "9–11岁", "12–14岁", "15–17岁"],
    domains: [{ domain: "英语", objectiveLimit: 16, manualLimit: 1 }],
  },
  AEIS_PRIMARY: {
    title: "AEIS小学入学准备度",
    allowedAgeBands: ["6–8岁", "9–11岁"],
    domains: [
      { domain: "CEQ英语准备", objectiveLimit: 12, manualLimit: 1 },
      { domain: "数学", objectiveLimit: 12, manualLimit: 0 },
    ],
  },
  AEIS_SECONDARY: {
    title: "AEIS中学入学准备度",
    allowedAgeBands: ["12–14岁", "15–17岁"],
    domains: [
      { domain: "英语", objectiveLimit: 14, manualLimit: 1 },
      { domain: "数学", objectiveLimit: 14, manualLimit: 0 },
    ],
  },
};

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

export function recentParallelFormExclusions(
  sessions: Array<{ formId: string; createdAt: Date }>,
  availableFormIds: string[],
  now = new Date(),
) {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let excluded = [...new Set(sessions.filter((row) => row.createdAt >= thirtyDaysAgo).map((row) => row.formId))];
  if (excluded.length >= availableFormIds.length) {
    const newestFirst = [...sessions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    excluded = [...new Set(newestFirst.slice(0, Math.max(0, availableFormIds.length - 1)).map((row) => row.formId))];
  }
  return excluded.filter((formId) => availableFormIds.includes(formId));
}

export function parallelRetestLimitReached(createdAts: Date[], now = new Date(), limit = 3) {
  const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  return createdAts.filter((createdAt) => createdAt.getTime() >= oneDayAgo).length >= limit;
}

function pathLabel(path: string) {
  if (path === "INTERNATIONAL_ENGLISH") return "国际学校英语";
  if (path === "AEIS_PRIMARY") return "AEIS小学";
  if (path === "AEIS_SECONDARY") return "AEIS中学";
  if (path === "INTERNATIONAL") return "国际学校";
  if (path === "MOE_AEIS") return "政府学校/AEIS";
  if (path === "DSA") return "DSA/面试/作品集";
  return "";
}

export function isAssessmentProduct(value: string): value is AssessmentProduct {
  return ACADEMIC_ASSESSMENT_PRODUCTS.includes(value as AssessmentProduct);
}

export function assessmentProductDefinition(value: string) {
  return isAssessmentProduct(value) ? PRODUCT_DEFINITIONS[value] : null;
}

export function validateAssessmentProductAge(targetPath: string, ageBand: string) {
  const product = assessmentProductDefinition(targetPath);
  if (!product) return true;
  return product.allowedAgeBands.includes(ageBand);
}

function assignmentForQuestion(formId: string, questionId: string) {
  const core = bank.assignments.find((row) => row.form_id === formId && row.question_id === questionId);
  if (core) return core;
  const form = bank.forms.find((row) => row.form_id === formId);
  const path = bank.pathAssignments.find((row) =>
    row.question_id === questionId && row["年龄"] === form?.["年龄"] && row["卷型"] === form?.["卷型"],
  );
  return path || bank.questions.find((row) => row.question_id === questionId);
}

function ageCodeForForm(formId: string) {
  const form = bank.forms.find((row) => row.form_id === formId);
  return String(form?.["年龄"] ?? "").replace("岁", "").replace(/[–—]/g, "-");
}

function rotatedTake<T>(rows: T[], limit: number, variant: string) {
  if (!rows.length || limit <= 0) return [];
  const offset = ({ A: 0, B: 1, C: 2 }[variant] ?? 0) * Math.max(1, Math.floor(rows.length / 3));
  return Array.from({ length: Math.min(limit, rows.length) }, (_, index) => rows[(offset + index) % rows.length]);
}

export function productQuestionIds(formId: string, targetPath: string) {
  const product = assessmentProductDefinition(targetPath);
  if (!product) return [];
  const ageBand = String(bank.forms.find((row) => row.form_id === formId)?.["年龄"] ?? "");
  return productQuestions(formId, targetPath, ageBand).map((row) => row.id);
}

export function initialQuestionIds(formId: string, targetPath = "") {
  if (isAssessmentProduct(targetPath)) return productQuestionIds(formId, targetPath);
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
  if (isAssessmentProduct(targetPath)) return productQuestionIds(formId, targetPath);
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
  const productQuestion = productQuestionById(formId, questionId);
  if (productQuestion) return {
    id: productQuestion.id,
    stage: productQuestion.subskill,
    domain: productQuestion.domain,
    subskill: productQuestion.subskill,
    type: productQuestion.type,
    prompt: productQuestion.prompt,
    options: productQuestion.options,
    expectedMinutes: productQuestion.expectedMinutes,
    requiresReviewer: productQuestion.type === "extended_response",
  };
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
    subskill: String(row["能力域"] ?? "综合能力"),
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
  const productQuestion = productQuestionById(formId, questionId);
  if (productQuestion) {
    if (productQuestion.type === "extended_response") return null;
    return normalizedAnswer(value) === normalizedAnswer(productQuestion.answer) ? productQuestion.maxScore : 0;
  }
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

function scoreBand(score: number) {
  return score < 40 ? "基础待建立" : score < 55 ? "发展中" : score < 70 ? "接近当前阶段要求" : score < 85 ? "表现稳定" : "表现较强";
}

function provisionalCefrRange(score: number) {
  if (score < 35) return "Pre-A1–A1";
  if (score < 50) return "A1–A2";
  if (score < 65) return "A2–B1";
  if (score < 80) return "B1–B2";
  return "B2–C1";
}

export function manualQuestionIds(formId: string, questionIds: string[]) {
  return questionIds.filter((id) => publicQuestion(formId, id).requiresReviewer);
}

export function assessmentInternalQuestion(formId: string, questionId: string) {
  const productQuestion = productQuestionById(formId, questionId);
  if (productQuestion) return {
    ...publicQuestion(formId, questionId),
    answerRule: productQuestion.answer,
    explanation: "产品专用平行卷",
    rubricId: productQuestion.type === "extended_response" ? "CEFR_WRITING_V1" : "",
    rubric: productQuestion.rubric || "",
    maxScore: productQuestion.maxScore,
  };
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
  const skills: Record<string, { score: number; max: number }> = {};
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
    const skillName = String(question.subskill || question.domain);
    const skillBucket = skills[skillName] ?? { score: 0, max: 0 };
    skillBucket.max += question.maxScore;
    skillBucket.score += typeof score === "number" ? Math.max(0, Math.min(question.maxScore, score)) : 0;
    skills[skillName] = skillBucket;
  }
  const completionRate = input.questionIds.length ? answered / input.questionIds.length : 0;
  const domainScores = Object.fromEntries(Object.entries(domains).map(([name, value]) => [name, Math.round((value.score / value.max) * 100)]));
  const skillScores = Object.fromEntries(Object.entries(skills).map(([name, value]) => [name, Math.round((value.score / value.max) * 100)]));
  const values = Object.values(domainScores);
  const legacyOverallScore = values.length ? Math.round(values.reduce((sum, score) => sum + score, 0) / values.length) : 0;
  const product = assessmentProductDefinition(input.targetPath);
  const overallScore = product
    ? input.targetPath === "INTERNATIONAL_ENGLISH" ? (domainScores["英语"] ?? 0) : null
    : legacyOverallScore;
  const overallBand = overallScore == null ? "分科查看，不合并总分" : scoreBand(overallScore);
  const minutes = input.durationSeconds / 60;
  const objectiveItemCount = input.questionIds.filter((id) => !assessmentInternalQuestion(input.formId, id).requiresReviewer).length;
  const manualItemCount = input.questionIds.length - objectiveItemCount;
  const evidenceThreshold = product ? (input.targetPath === "INTERNATIONAL_ENGLISH" ? 16 : 20) : 20;
  const confidence = pendingManual > 0
    ? "待人工"
    : completionRate < 0.9 || input.questionIds.length < evidenceThreshold
      ? "低"
      : minutes >= 20 && minutes <= 60
        ? "高"
        : "中";
  const ranked = Object.entries(domainScores).sort((a, b) => b[1] - a[1]);
  const strengths = ranked.slice(0, 3).map(([name, score]) => `${name}：本次内部任务得分 ${score}`);
  const priorities = [...ranked].reverse().slice(0, 3).map(([name, score]) => `${name}：建议优先复核与训练（本次 ${score}）`);
  const scorecards = product ? product.domains.map((rule) => {
    const score = domainScores[rule.domain] ?? 0;
    const label = input.targetPath === "AEIS_PRIMARY" && rule.domain === "CEQ英语准备"
      ? "CEQ英语资格准备"
      : input.targetPath === "AEIS_PRIMARY"
        ? "AEIS小学数学准备"
        : input.targetPath === "AEIS_SECONDARY"
          ? `AEIS中学${rule.domain}准备`
          : "国际学校英语准备度";
    return {
      key: rule.domain.includes("英语") ? "english" : "math",
      label,
      score,
      scoreLabel: `${score} / 100`,
      band: scoreBand(score),
      cefrReference: rule.domain.includes("英语") ? provisionalCefrRange(score) : null,
    };
  }) : [];
  return {
    completionRate,
    pendingManual,
    domainScores,
    overallScore,
    overallBand,
    confidence,
    report: {
      scoreModelVersion: product ? "PATHWAY_V4" : "LEGACY_V1",
      productTitle: product?.title ?? (pathLabel(input.targetPath) || "入学准备度"),
      scorecards,
      skillScores,
      measuredSkills: Object.keys(skillScores),
      unmeasuredSkills: product ? ["听力", "口语"] : [],
      evidence: product ? {
        totalItems: input.questionIds.length,
        objectiveItems: objectiveItemCount,
        reviewedItems: manualItemCount,
        skillCoverage: Object.keys(skillScores),
        ageBandSpecific: true,
        parallelForm: input.formId.slice(-1),
      } : null,
      standard: product
        ? "博思内部诊断，不是学校、iTEP、CEQ、MOE或AEIS官方成绩。CEFR为按年龄分层、基于阅读、语言运用与写作的初步参考区间（待对照样本校准）；本轮未测听力和口语，不据此推断录取。"
        : "博思内部入学准备度标准，不是学校、MOE、AEIS官方分数、百分位或录取预测。",
      strengths,
      priorities,
      targetPath: pathLabel(input.targetPath) || "暂未确定",
      nextStep: product
        ? input.targetPath === "AEIS_PRIMARY"
          ? "小学AEIS正式考试只考数学，报名还需满足CEQ要求；本报告分别显示CEQ英语准备与AEIS数学诊断，不合并总分。学科补习前由老师首节1对1复核。"
          : input.targetPath === "AEIS_SECONDARY"
            ? "中学AEIS按英语与数学分别诊断，不设置科学分数，也不合并成录取概率。由老师结合目标年级完成首节1对1复核。"
            : "由顾问结合目标学校解读CEFR参考区间；听力、口语和具体学科应在首节1对1课堂中补充诊断。"
        : "建议由顾问与学科老师结合目标学校官方要求，制定8–12周准备计划。",
    },
  };
}

export type AcademicAssessmentStoredAnswer = StoredAnswer;
