export const PARENT_FEEDBACK_SECTION_LABELS = [
  "本节课重点",
  "目前发现",
  "课堂表现",
  "下一步计划",
  "家长需要知道",
] as const;

export function buildParentFeedbackTemplate() {
  return PARENT_FEEDBACK_SECTION_LABELS.map((label) => `${label}：\n`).join("\n");
}

export function getMissingParentFeedbackSections(value: string) {
  const text = String(value ?? "");
  return PARENT_FEEDBACK_SECTION_LABELS.filter((label, index) => {
    const heading = new RegExp(`${label}\\s*[:：]`, "i");
    const match = heading.exec(text);
    if (!match) return true;

    const bodyStart = match.index + match[0].length;
    const laterIndexes = PARENT_FEEDBACK_SECTION_LABELS.slice(index + 1)
      .map((nextLabel) => {
        const nextMatch = new RegExp(`${nextLabel}\\s*[:：]`, "i").exec(text.slice(bodyStart));
        return nextMatch ? bodyStart + nextMatch.index : -1;
      })
      .filter((nextIndex) => nextIndex >= 0);
    const bodyEnd = laterIndexes.length ? Math.min(...laterIndexes) : text.length;
    return text.slice(bodyStart, bodyEnd).trim().length === 0;
  });
}
