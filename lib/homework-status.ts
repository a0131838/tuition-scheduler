export const NO_HOMEWORK_TEXT = "Not Set / 本节未布置作业";
export function previousHomeworkInput(value: unknown) {
  const raw = String(value ?? "").trim();
  return { previousHomeworkDone: raw === "yes" ? true : raw === "no" ? false : null,
    previousHomeworkNotAssigned: raw === "not_assigned", valid: ["yes", "no", "not_assigned"].includes(raw) };
}
export function previousHomeworkLabel(row: { previousHomeworkDone?: boolean | null; previousHomeworkNotAssigned?: boolean }) {
  return row.previousHomeworkNotAssigned ? "Not Set / 上次未布置或首次课" : row.previousHomeworkDone === true ? "Yes / 已完成" : row.previousHomeworkDone === false ? "No / 未完成或部分完成" : "Not recorded / 未填写";
}
