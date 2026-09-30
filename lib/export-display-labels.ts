type ExportLang = "EN" | "ZH" | "BILINGUAL";
const labels: Record<string, readonly [string, string]> = {
  HOURS: ["Hour package", "课时包"], MONTHLY: ["Monthly package", "月包"],
  ACTIVE: ["Active", "有效"], PAUSED: ["Paused", "已暂停"], EXPIRED: ["Expired", "已到期"],
  UNMARKED: ["Unmarked", "未点名"], PRESENT: ["Present", "出席"], ABSENT: ["Absent", "缺席"], LATE: ["Late", "迟到"], EXCUSED: ["Excused", "请假"],
  PURCHASE: ["Purchase", "购入"], DEDUCT: ["Deduction", "扣减"], ROLLBACK: ["Reversal", "冲回"], ADJUST: ["Adjustment", "调整"],
  PAID: ["Paid", "已收款"], PARTIAL: ["Partial", "部分收款"], PENDING_APPROVAL: ["Pending approval", "待审批"], REJECTED: ["Rejected", "已驳回"], CREDITED: ["Fully credited", "已全额冲减"], VOID: ["Void", "已作废"], UNPAID: ["Unpaid", "未收款"], ISSUED: ["Issued", "已开具"], DRAFT: ["Draft", "草稿"],
  PARENT: ["Parent", "家长"], PARTNER: ["Partner", "合作方"], BUSINESS: ["Business", "企业"],
  INVOICE: ["Invoice", "发票"], RECEIPT: ["Receipt", "收据"], CREDIT_NOTE: ["Credit Note", "贷项通知单"],
};

/** Display only: never changes document keys, statuses, amounts or ledger values. */
export function exportDisplayLabel(value: string | null | undefined, lang: ExportLang) {
  if (!value) return "-";
  const label = labels[value];
  if (!label) return value;
  return lang === "EN" ? label[0] : lang === "ZH" ? label[1] : `${label[0]} / ${label[1]}`;
}
