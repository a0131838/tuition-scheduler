export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDateOnly(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

export function formatMonthKey(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}`;
}
