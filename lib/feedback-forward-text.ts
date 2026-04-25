import { formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";
import { PARENT_FEEDBACK_SECTIONS, parseParentFeedbackSections } from "@/lib/parent-feedback-format";

type ForwardFeedbackRow = {
  content?: string | null;
  classPerformance?: string | null;
  homework?: string | null;
  previousHomeworkDone?: boolean | null;
  teacher?: { name?: string | null } | null;
  session: {
    startAt: Date;
    endAt: Date;
    class: {
      course: { name: string };
      subject?: { name: string } | null;
      level?: { name: string } | null;
    };
  };
};

function cleanLine(value: string | null | undefined) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function classLine(row: ForwardFeedbackRow) {
  return `${row.session.class.course.name}${row.session.class.subject ? ` / ${row.session.class.subject.name}` : ""}${
    row.session.class.level ? ` / ${row.session.class.level.name}` : ""
  }`;
}

function compactBlankLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasStructuredParentFeedback(value: string) {
  const parsed = parseParentFeedbackSections(value);
  return PARENT_FEEDBACK_SECTIONS.filter((section) => cleanLine(parsed[section.key]).length > 0).length >= 2;
}

function parentFeedbackBody(value: string) {
  const parsed = parseParentFeedbackSections(value);
  const sections = PARENT_FEEDBACK_SECTIONS.map((section) => {
    const body = cleanLine(parsed[section.key]);
    if (!body) return "";
    return `${section.zh}：\n${body}`;
  }).filter(Boolean);
  return sections.join("\n\n");
}

export function buildWeChatFeedbackText(row: ForwardFeedbackRow, studentNames: string[]) {
  const studentLabel = studentNames.length > 0 ? studentNames.join("、") : "学生";
  const source = cleanLine(row.classPerformance) || cleanLine(row.content);
  const body = hasStructuredParentFeedback(source) ? parentFeedbackBody(source) : `课堂反馈：\n${source || "暂无反馈内容"}`;
  const homework = cleanLine(row.homework);
  const previousHomework =
    row.previousHomeworkDone === true ? "已完成" : row.previousHomeworkDone === false ? "未完成/未完全完成" : "";
  const lines = [
    `【${studentLabel} 课后反馈】`,
    `课程：${classLine(row)}`,
    `时间：${formatBusinessDateTime(new Date(row.session.startAt))} - ${formatBusinessTimeOnly(new Date(row.session.endAt))}`,
    `老师：${row.teacher?.name ?? "-"}`,
    "",
    body,
    homework ? `\n课后作业：\n${homework}` : "",
    previousHomework ? `\n上次作业完成情况：${previousHomework}` : "",
  ];
  return compactBlankLines(lines.filter(Boolean).join("\n"));
}
