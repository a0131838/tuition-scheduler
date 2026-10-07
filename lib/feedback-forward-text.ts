import { formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";

type ForwardFeedbackRow = {
  content?: string | null;
  parentContent?: string | null;
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

export function buildWeChatFeedbackText(row: ForwardFeedbackRow, studentNames: string[]) {
  const studentLabel = studentNames.length > 0 ? studentNames.join("、") : "学生";
  const parentContent = cleanLine(row.parentContent);
  const source = cleanLine(row.content) || cleanLine(row.classPerformance);
  const body = parentContent || `课堂反馈 / Lesson feedback：\n${source || "暂无反馈内容 / No feedback content"}`;
  const homework = parentContent ? "" : cleanLine(row.homework);
  const previousHomework =
    parentContent ? "" : row.previousHomeworkDone === true ? "已完成" : row.previousHomeworkDone === false ? "未完成/未完全完成" : "";
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
