export const PARENT_FEEDBACK_SECTIONS = [
  {
    en: "Lesson focus",
    zh: "本节课重点",
    promptEn: "What learning problem did the student mainly work on today?",
    promptZh: "孩子今天主要解决了什么学习问题？",
  },
  {
    en: "Current finding",
    zh: "目前发现",
    promptEn: "What is the real learning bottleneck you observed?",
    promptZh: "你观察到的真实学习卡点是什么？",
  },
  {
    en: "Class performance",
    zh: "课堂表现",
    promptEn: "What visible progress, effort, accuracy, or difficulty appeared in class?",
    promptZh: "课堂上有什么可观察的进步、投入度、正确率或困难？",
  },
  {
    en: "Next plan",
    zh: "下一步计划",
    promptEn: "What will you train next, ideally with a time range or clear focus?",
    promptZh: "接下来会训练什么，最好写清时间范围或重点方向。",
  },
  {
    en: "What parents should know",
    zh: "家长需要知道",
    promptEn: "What should the parent understand so they do not misread the student's situation?",
    promptZh: "家长应该如何理解孩子目前的状态，避免误判？",
  },
] as const;

export const PARENT_FEEDBACK_SECTION_LABELS = PARENT_FEEDBACK_SECTIONS.map((section) => section.zh);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildParentFeedbackTemplate() {
  return PARENT_FEEDBACK_SECTIONS.map(
    (section) => `${section.en} / ${section.zh}:\nHint / 提示: ${section.promptEn} / ${section.promptZh}\n`
  ).join("\n");
}

export function getMissingParentFeedbackSections(value: string) {
  const text = String(value ?? "");
  return PARENT_FEEDBACK_SECTIONS.filter((section, index) => {
    const heading = new RegExp(`(?:${section.en}\\s*/\\s*)?${section.zh}|${section.en}`, "i");
    const match = heading.exec(text);
    if (!match) return true;

    const headingEndMatch = /[:：]/.exec(text.slice(match.index + match[0].length));
    const bodyStart = headingEndMatch ? match.index + match[0].length + headingEndMatch.index + 1 : match.index + match[0].length;
    const laterIndexes = PARENT_FEEDBACK_SECTIONS.slice(index + 1)
      .map((nextSection) => {
        const nextHeading = new RegExp(`(?:${nextSection.en}\\s*/\\s*)?${nextSection.zh}|${nextSection.en}`, "i");
        const nextMatch = nextHeading.exec(text.slice(bodyStart));
        return nextMatch ? bodyStart + nextMatch.index : -1;
      })
      .filter((nextIndex) => nextIndex >= 0);
    const bodyEnd = laterIndexes.length ? Math.min(...laterIndexes) : text.length;
    const body = text
      .slice(bodyStart, bodyEnd)
      .replace(
        new RegExp(`Hint\\s*/\\s*提示\\s*:\\s*${escapeRegExp(section.promptEn)}\\s*/\\s*${escapeRegExp(section.promptZh)}`, "i"),
        ""
      )
      .trim();
    return body.length === 0;
  }).map((section) => `${section.en} / ${section.zh}`);
}
