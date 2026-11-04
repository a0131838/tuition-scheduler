import { createHash } from "node:crypto";
import { parseReportDraft } from "./midterm-report";
import { parseFinalReportDraft } from "./final-report";
export type ParentReportKind = "MIDTERM" | "FINAL" | "RENEWAL";
export type ParentReportField = {
  key: string;
  labelZh: string;
  labelEn: string;
  sectionZh: string;
  sectionEn: string;
  value: string;
};
export type ParentReportSource = {
  version: 1;
  kind: ParentReportKind;
  reportId: string;
  student: string;
  teacher: string;
  course: string;
  subject: string;
  date: string;
  periodZh: string;
  periodEn: string;
  level: string;
  score: string;
  target: string;
  fields: ParentReportField[];
};
export type ParentReportContent = {
  translations: Record<string, string>;
  summary: Array<{ zh: string; en: string; evidenceKeys: string[] }>;
};
export function parentSourceHash(source: ParentReportSource) {
  return createHash("sha256").update(JSON.stringify(source)).digest("hex");
}
export function parentReportFields(
  kind: ParentReportKind,
  raw: unknown,
): ParentReportField[] {
  const draft: Record<string, string> =
    kind === "MIDTERM" ? parseReportDraft(raw) : parseFinalReportDraft(raw);
  const fields: ParentReportField[] = [];
  function add(
    key: string,
    zh: string,
    en: string,
    sectionZh: string,
    sectionEn: string,
  ) {
    const value = draft[key]?.trim();
    if (value && value !== "-")
      fields.push({
        key,
        labelZh: zh,
        labelEn: en,
        sectionZh,
        sectionEn,
        value,
      });
  }
  if (kind === "MIDTERM") {
    add(
      "overallEstimatedLevel",
      "整体水平",
      "Overall level",
      "本阶段学习情况",
      "This stage in summary",
    );
    add(
      "overallSummary",
      "综合表现",
      "Performance summary",
      "本阶段学习情况",
      "This stage in summary",
    );
    for (const [prefix, zh, en] of [
      ["listening", "听力", "Listening"],
      ["reading", "阅读", "Reading"],
      ["writing", "写作", "Writing"],
      ["speaking", "口语", "Speaking"],
    ]) {
      add(prefix + "Level", "本次预估等级", "Estimated level", zh, en);
      for (const [suffix, z, e] of [
        ["Performance", "测试与课堂表现", "Performance"],
        ["Strengths", "已有优势", "Strengths"],
        ["Improvements", "下一步提升方向", "Areas to improve"],
      ])
        add(prefix + suffix, z, e, zh, en);
    }
    for (const [key, zh, en] of [
      ["classParticipation", "课堂参与", "Participation"],
      ["focusEngagement", "专注与投入", "Focus"],
      ["homeworkPreparation", "作业完成", "Homework"],
      ["attitudeGeneral", "总体学习态度", "Learning attitude"],
    ])
      add(key, zh, en, "学习态度与习惯", "Learning attitude and habits");
    for (const [key, zh, en] of [
      ["keyStrengths", "核心优势", "Key strengths"],
      ["primaryBottlenecks", "当前主要困难", "Main challenges"],
      ["nextPhaseFocus", "下一阶段重点", "Next-stage focus"],
      ["suggestedPracticeLoad", "老师建议的练习", "Suggested practice"],
      [
        "targetLevelScore",
        "下一阶段目标（尚未达成）",
        "Target level or score (not an achieved result)",
      ],
    ])
      add(key, zh, en, "下一阶段怎么学", "Next steps");
    add(
      "assessmentTool",
      "评估方式",
      "Assessment method",
      "评估说明与成绩",
      "Assessment details",
    );
    add(
      "warningNote",
      "评估说明",
      "Assessment note",
      "评估说明与成绩",
      "Assessment details",
    );
    for (let i = 1; i <= 6; i++) {
      const label = draft[`examMetric${i}Label`] || `Item ${i}`;
      add(
        `examMetric${i}Value`,
        label,
        label,
        "评估说明与成绩",
        "Assessment details",
      );
    }
    if (draft.examName)
      add(
        "examName",
        "考试名称",
        "Assessment name",
        "评估说明与成绩",
        "Assessment details",
      );
    add(
      "examTotalValue",
      draft.examTotalLabel || "考试总分",
      draft.examTotalLabel || "Assessment total",
      "评估说明与成绩",
      "Assessment details",
    );
  } else {
    for (const [key, zh, en, sz, se] of [
      [
        "finalSummary",
        "本阶段学习总结",
        "This stage in summary",
        "本阶段学习情况",
        "This stage in summary",
      ],
      [
        "strengths",
        "已有优势与进步",
        "Strengths and progress",
        "已有优势与进步",
        "Strengths and progress",
      ],
      [
        "areasToContinue",
        "下一阶段需要加强什么",
        "Areas to keep strengthening",
        "下一阶段怎么学",
        "Next steps",
      ],
      [
        "parentNote",
        "老师给家长的话",
        "Teacher note to family",
        "老师与家庭的配合",
        "Teacher and family",
      ],
      [
        "attendanceComment",
        "出勤与课堂投入",
        "Attendance and engagement",
        "学习态度与习惯",
        "Learning attitude and habits",
      ],
      [
        "homeworkComment",
        "作业表现",
        "Homework",
        "学习态度与习惯",
        "Learning attitude and habits",
      ],
      [
        "initialGoals",
        "回看本阶段目标",
        "Starting goals",
        "回看学习目标",
        "Looking back at the goals",
      ],
    ])
      add(key, zh, en, sz, se);
  }
  return fields;
}
const tokens = (value: string): string[] =>
  value.match(/\d+(?:\.\d+)?|\b[A-C][12]\b/g) || [];
export function validateParentReportContent(
  raw: unknown,
  fields: ParentReportField[],
): ParentReportContent {
  const obj = raw as ParentReportContent;
  if (
    !obj ||
    typeof obj !== "object" ||
    !obj.translations ||
    typeof obj.translations !== "object" ||
    Array.isArray(obj.translations) ||
    !Array.isArray(obj.summary)
  )
    throw Error("AI_FORMAT");
  const expected = new Set(fields.map((f) => f.key));
  if (
    Object.keys(obj.translations).length !== expected.size ||
    Object.keys(obj.translations).some((k) => !expected.has(k))
  )
    throw Error("AI_FIELDS");
  for (const f of fields) {
    const value = obj.translations[f.key];
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > Math.max(1000, f.value.length * 5) ||
      value.includes("\u0000")
    )
      throw Error("AI_TRANSLATION");
    const sourceTokens = tokens(f.value);
    const outputTokens = tokens(value);
    if (
      sourceTokens.some((t) => !outputTokens.includes(t)) ||
      outputTokens.some((t) => !sourceTokens.includes(t))
    )
      throw Error("AI_FACTS");
    if (/[a-z]{3}/i.test(f.value) && !/[\u3400-\u9fff]/.test(value))
      throw Error("AI_LANGUAGE");
  }
  if (obj.summary.length > 4) throw Error("AI_SUMMARY");
  for (const item of obj.summary) {
    if (
      !item ||
      typeof item.zh !== "string" ||
      typeof item.en !== "string" ||
      !item.zh.trim() ||
      !item.en.trim() ||
      item.zh.length > 350 ||
      item.en.length > 900 ||
      !Array.isArray(item.evidenceKeys) ||
      !item.evidenceKeys.length ||
      item.evidenceKeys.some((k) => !expected.has(k))
    )
      throw Error("AI_SUMMARY");
    const evidence = fields
      .filter((f) => item.evidenceKeys.includes(f.key))
      .map((f) => f.value)
      .join(" ");
    if (
      tokens(item.zh + " " + item.en).some((t) => !tokens(evidence).includes(t))
    )
      throw Error("AI_FACTS");
  }
  return {
    translations: Object.fromEntries(
      fields.map((f) => [f.key, obj.translations[f.key].trim()]),
    ),
    summary: obj.summary.map((s) => ({
      zh: s.zh.trim(),
      en: s.en.trim(),
      evidenceKeys: [...new Set(s.evidenceKeys)],
    })),
  };
}

// Host/protocol are forwarded by the existing reverse proxy; req.url may be internal HTTP.
export function isParentReportSameOrigin(
  req: Request,
  configuredOrigin?: string,
) {
  const origin = req.headers.get("origin")?.trim();
  if (!origin) return false;
  try {
    if (new URL(origin).origin !== origin) return false;
    const url = new URL(req.url);
    const allowed = new Set([url.origin]);
    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto");
    if (host && (proto === "https" || proto === "http"))
      allowed.add(new URL(`${proto}://${host}`).origin);
    if (configuredOrigin) allowed.add(new URL(configuredOrigin).origin);
    return allowed.has(origin);
  } catch {
    return false;
  }
}
