import { reasons } from "./prepaid-family-calculation";
import type { PrepaidRow } from "./prepaid-family-report";
export function prepaidBalanceCsv(date: string, rows: PrepaidRow[]) {
  const headers = [
    "截止日期 / Cutoff",
    "家庭或共享结算组 / Family",
    "课程 / Course",
    "课包 ID",
    "原报表小时 / Old hours",
    "结算后剩余小时 / Remaining hours",
    "已上待结算小时 / Arrears hours",
    "旧估值 SGD / Old estimate",
    "已核实预收余额 SGD / Verified prepaid",
    "可比差额 SGD / Comparable difference",
    "状态 / Status",
    "核对原因 / Reason",
    "依据 / Evidence",
  ];
  const lines: (string | number)[][] = [headers];
  for (const row of rows)
    lines.push([
      date,
      row.family,
      row.course,
      row.id,
      row.legacyMinutes / 60,
      row.minutes === null ? "" : Math.max(0, row.minutes) / 60,
      row.minutes === null ? "" : Math.max(0, -row.minutes) / 60,
      (row.legacyCents / 100).toFixed(2),
      row.prepaidCents === null ? "" : (row.prepaidCents / 100).toFixed(2),
      row.prepaidCents === null ? "" : (row.prepaidCents - row.legacyCents) / 100,
      row.prepaidCents === null ? "待核对 / Review" : "已核实 / Verified",
      row.issues.map((k) => reasons[k]).join(" | "),
      row.evidence.join(" | "),
    ]);
  const cell = (value: string | number) => {
    let str = String(value);
    if (typeof value === "string" && /^[\s]*[=@+\-]/.test(str)) str = "'" + str;
    return '"' + str.replaceAll('"', '""') + '"';
  };
  return "\uFEFF" + lines.map((line) => line.map(cell).join(",")).join("\r\n");
}
