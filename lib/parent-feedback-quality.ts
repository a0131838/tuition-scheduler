import { parseParentFeedbackSections, type ParentFeedbackSectionKey } from "./parent-feedback-format";

type FeedbackQualityIssue = {
  key: string;
  label: string;
  section?: ParentFeedbackSectionKey;
};

const MIN_SECTION_LENGTH = 12;
const TIME_RANGE_RE = /((\d+|一|二|两|三|四|五|六|七|八|九|十)\s*(天|周|个月|月|week|weeks|day|days|month|months))|下节|下一节|本周|下周|two weeks|next/i;
const CONCRETE_EVIDENCE_RE = /\d|例|例如|比如|准确率|正确率|independent|independently|accuracy|out of|example/i;
const GENERIC_RE = /^(ok|good|fine|不错|很好|可以|正常|继续保持|加油|无)$/i;

function compact(value: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isTooThin(value: string) {
  const text = compact(value);
  return text.length < MIN_SECTION_LENGTH || GENERIC_RE.test(text);
}

export function evaluateParentFeedbackQuality(content: string) {
  const values = parseParentFeedbackSections(content);
  const issues: FeedbackQualityIssue[] = [];

  for (const [section, value] of Object.entries(values) as Array<[ParentFeedbackSectionKey, string]>) {
    if (isTooThin(value)) {
      issues.push({
        key: `thin-${section}`,
        section,
        label: "内容过短或过泛",
      });
    }
  }

  if (!CONCRETE_EVIDENCE_RE.test(values.classPerformance)) {
    issues.push({
      key: "no-class-evidence",
      section: "classPerformance",
      label: "课堂表现缺少可观察证据",
    });
  }

  if (!TIME_RANGE_RE.test(values.nextPlan)) {
    issues.push({
      key: "no-next-plan-range",
      section: "nextPlan",
      label: "下一步计划缺少时间范围",
    });
  }

  if (compact(values.parentNote).length < 18) {
    issues.push({
      key: "thin-parent-note",
      section: "parentNote",
      label: "家长说明不够具体",
    });
  }

  const score = Math.max(0, 100 - issues.length * 12);
  const status = score >= 88 ? "good" : score >= 70 ? "watch" : "risk";

  return {
    score,
    status,
    issues,
    issueLabels: issues.map((issue) => issue.label),
  };
}

export function isParentFeedbackQualityRisk(content: string) {
  return evaluateParentFeedbackQuality(content).status === "risk";
}
