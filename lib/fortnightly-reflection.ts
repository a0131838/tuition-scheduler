import { formatBusinessDateOnly } from "./date-only";

export const FIRST_DUE = "2026-12-13";
export const checks = [
  ["receiptsInvoicesClaimsChecked", "Outstanding receipts, invoices and claims approvals checked / 已检查未完成的收据、发票及报销审批"],
  ["feedbackQualityChecked", "Teacher feedback quality reviewed / 已检查教师课后反馈质量"],
  ["midtermReportsChecked", "Mid-term report follow-ups reviewed / 已检查中期报告跟进情况"],
  ["finalReportsChecked", "End-term report follow-ups reviewed / 已检查结课报告跟进情况"],
] as const;
export const stages = [
  ["description", "2. Description / 事件描述", "What happened? What were you trying to achieve, who was involved, and what was the outcome? / 发生了什么？你当时希望达成什么目标？涉及哪些人？结果如何？"],
  ["feelings", "3. Feelings / 感受", "How did you feel during and after the situation? Did those feelings affect how you communicated, made a decision or responded? / 你在事情发生时及事后有什么感受？这些感受是否影响了你的沟通、决策或回应方式？"],
  ["evaluation", "4. Evaluation / 评价", "What went well, and what was difficult? What effect did your actions have on the team, teaching quality, students, parents or the institute? / 哪些方面处理得好？哪些方面较困难？你的做法对团队、教学质量、学生、家长或学院产生了什么影响？"],
  ["analysis", "5. Analysis / 分析", "Why do you think it unfolded this way? What assumptions shaped your response? Were the causes related to an individual, communication, a process or the wider system? Whose perspective might you have missed? / 你认为事情为何会这样发展？哪些假设影响了你的回应？原因与个人、沟通、流程还是整体制度有关？你可能忽略了谁的观点？"],
  ["conclusion", "6. Conclusion / 总结与学习", "What have you learned about your management or leadership? What would you repeat, change or handle differently next time? / 你从这件事中学到了什么管理或领导经验？下次你会继续、调整或以不同方式处理什么？"],
] as const;
export const checkLabels = { complete: "Complete / 已完成", follow: "Follow-up needed / 需要跟进", na: "N/A / 不适用" };
export const actionLabels = { open: "Open / 未完成", progress: "In progress / 进行中", completed: "Completed / 已完成" };
export type Action = { text: string; deadline: string; evidence: string; status: keyof typeof actionLabels };
export type Review = Action & { id: string; note: string };
export type Content = {
  checks: Record<string, { status: string; note: string }>;
  narrative: Record<string, string>;
  action_plan: Action[];
  previous_actions_review: Review[];
};
export type Period = { dueDate: string; submittedAt: Date | null; revision: number; content: Content };

export function validDay(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
}
export function shift(day: string, days: number) {
  return new Date(Date.parse(day) + days * 86400000).toISOString().slice(0,10);
}
export function cycleDates(firstDue: string, today: string) {
  const result = [firstDue];
  for (let due = shift(firstDue, 14); shift(due, -13) <= today; due = shift(due, 14)) result.push(due);
  return result;
}
export function periodLabel(due: string, today: string, row?: Period) {
  if (row?.submittedAt) return formatBusinessDateOnly(row.submittedAt) > due ? "Submitted late / 已补交" : "Submitted / 已提交";
  if (due < today) return "Overdue / 逾期";
  if (due === today) return "Due today / 今日截止";
  if (due <= shift(today, 2)) return "Due soon / 即将截止";
  return row ? "Draft / 草稿" : "Upcoming / 待填写";
}
export function openActions(periods: Period[], before: string) {
  const items = new Map<string, Review>();
  for (const row of [...periods].sort((a,b) => a.dueDate.localeCompare(b.dueDate))) {
    if (!row.submittedAt || row.dueDate >= before) continue;
    for (const review of row.content.previous_actions_review) items.set(review.id, review);
    row.content.action_plan.forEach((action,i) => {
      const id = row.dueDate + "/" + (i + 1);
      items.set(id, { ...action, id, note: "" });
    });
  }
  return [...items.values()].filter(a => a.status !== "completed");
}

export function readContent(form: FormData, submit: boolean, prior: Review[]): Content {
  function field(name: string, limit = 6000) {
    const value = String(form.get(name) ?? "").trim();
    if (value.length > limit) throw new Error("Text exceeds the field limit / 文字超过长度限制");
    return value;
  }
  function status(name: string) {
    const value = field(name);
    if (!Object.hasOwn(actionLabels, value)) throw new Error("Select an action status / 请选择行动状态");
    return value as Action["status"];
  }
  const content: Content = { checks: {}, narrative: {}, action_plan: [], previous_actions_review: [] };
  for (const [key] of checks) {
    const value = field(key), note = field(key + "Note", 1000);
    if ((value || submit) && !Object.hasOwn(checkLabels, value)) throw new Error("Choose a status for all four checks / 请选齐四项运营检查状态");
    if (submit && value === "follow" && !note) throw new Error("Describe the follow-up needed / 请填写需要跟进的事项");
    content.checks[key] = {status: value, note};
  }
  for (const [key] of stages) content.narrative[key] = field(key);
  const count = Number(field("actionCount"));
  if (!Number.isInteger(count) || count < 1 || count > 3) throw new Error("Add one to three actions / 请填写一至三项行动");
  for (let i = 0; i < count; i++) {
    const text = field("action"+i, 2000), deadline = field("deadline"+i), evidence = field("evidence"+i, 2000);
    if ((deadline && !validDay(deadline)) || (submit && (!text || !deadline || !evidence))) throw new Error("Each action needs a description, deadline and evidence of progress / 每项行动请填写内容、期限和进展依据");
    content.action_plan.push({text, deadline, evidence, status: status("status"+i)});
  }
  for (const action of prior) {
    if (!form.has("reviewStatus"+action.id)) throw new Error("Previous actions have changed. Reload to review them / 上期行动有更新，请刷新后核对");
    content.previous_actions_review.push({...action, status: status("reviewStatus"+action.id), note: field("reviewNote"+action.id, 1000)});
  }
  return content;
}
