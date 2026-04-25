export const PARENT_FEEDBACK_SECTIONS = [
  {
    key: "lessonFocus",
    en: "Lesson focus",
    zh: "本节课重点",
    promptEn: "What learning problem did the student mainly work on today?",
    promptZh: "孩子今天主要解决了什么学习问题？",
    exampleEn: "The student mainly worked on making paragraph logic clearer.",
    exampleZh: "孩子今天主要训练让段落逻辑更清楚。",
  },
  {
    key: "currentFinding",
    en: "Current finding",
    zh: "目前发现",
    promptEn: "What is the real learning bottleneck you observed?",
    promptZh: "你观察到的真实学习卡点是什么？",
    exampleEn: "She understands the topic, but jumps between ideas too quickly.",
    exampleZh: "她能理解主题，但观点之间跳得太快。",
  },
  {
    key: "classPerformance",
    en: "Class performance",
    zh: "课堂表现",
    promptEn: "What visible progress, effort, accuracy, or difficulty appeared in class?",
    promptZh: "课堂上有什么可观察的进步、投入度、正确率或困难？",
    exampleEn: "Today she independently improved 3 out of 5 topic sentences.",
    exampleZh: "今天她能独立修改 5 个主题句中的 3 个。",
  },
  {
    key: "nextPlan",
    en: "Next plan",
    zh: "下一步计划",
    promptEn: "What will you train next, ideally with a time range or clear focus?",
    promptZh: "接下来会训练什么，最好写清时间范围或重点方向。",
    exampleEn: "Over the next two weeks, we will train paragraph expansion and linking words.",
    exampleZh: "接下来两周会训练段落展开和连接词使用。",
  },
  {
    key: "parentNote",
    en: "What parents should know",
    zh: "家长需要知道",
    promptEn: "What should the parent understand so they do not misread the student's situation?",
    promptZh: "家长应该如何理解孩子目前的状态，避免误判？",
    exampleEn: "This is a writing-structure habit, not a motivation issue.",
    exampleZh: "这主要是写作结构习惯问题，不是学习态度问题。",
  },
] as const;

export const PARENT_FEEDBACK_SECTION_LABELS = PARENT_FEEDBACK_SECTIONS.map((section) => section.zh);
export type ParentFeedbackSectionKey = (typeof PARENT_FEEDBACK_SECTIONS)[number]["key"];
export type ParentFeedbackSectionValues = Record<ParentFeedbackSectionKey, string>;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildParentFeedbackTemplate() {
  return buildParentFeedbackText(emptyParentFeedbackSectionValues());
}

export function emptyParentFeedbackSectionValues(): ParentFeedbackSectionValues {
  return Object.fromEntries(PARENT_FEEDBACK_SECTIONS.map((section) => [section.key, ""])) as ParentFeedbackSectionValues;
}

export function buildParentFeedbackText(values: ParentFeedbackSectionValues) {
  return PARENT_FEEDBACK_SECTIONS.map((section) => {
    const value = String(values[section.key] ?? "").trim();
    return `${section.en} / ${section.zh}:\n${value}`;
  }).join("\n\n");
}

function headingPattern(section: (typeof PARENT_FEEDBACK_SECTIONS)[number]) {
  return new RegExp(`(?:${escapeRegExp(section.en)}\\s*/\\s*)?${escapeRegExp(section.zh)}|${escapeRegExp(section.en)}`, "i");
}

function stripPromptLines(value: string) {
  return value.replace(/^Hint\s*\/\s*提示\s*:.*$/gim, "").trim();
}

export function parseParentFeedbackSections(value: string): ParentFeedbackSectionValues {
  const text = String(value ?? "");
  const values = emptyParentFeedbackSectionValues();
  const found = PARENT_FEEDBACK_SECTIONS.map((section) => {
    const match = headingPattern(section).exec(text);
    if (!match) return null;
    const colonMatch = /[:：]/.exec(text.slice(match.index + match[0].length));
    const bodyStart = colonMatch ? match.index + match[0].length + colonMatch.index + 1 : match.index + match[0].length;
    return { section, index: match.index, bodyStart };
  })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.index - b.index);

  if (found.length === 0) {
    values.classPerformance = text.trim();
    return values;
  }

  for (let i = 0; i < found.length; i += 1) {
    const current = found[i];
    const next = found[i + 1];
    values[current.section.key] = stripPromptLines(text.slice(current.bodyStart, next ? next.index : text.length));
  }

  return values;
}

export function getMissingParentFeedbackSectionLabels(values: ParentFeedbackSectionValues) {
  return PARENT_FEEDBACK_SECTIONS.filter((section) => !String(values[section.key] ?? "").trim()).map(
    (section) => `${section.en} / ${section.zh}`
  );
}

export function getMissingParentFeedbackSections(value: string) {
  return getMissingParentFeedbackSectionLabels(parseParentFeedbackSections(value));
}
