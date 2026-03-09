export const ABNORMAL_TXN_KINDS = ["ADJUST", "ROLLBACK"] as const;

export const ABNORMAL_REASON_OPTIONS = [
  { value: "DATA_FIX", label: "DATA_FIX / 数据修正" },
  { value: "FINANCE_RECON", label: "FINANCE_RECON / 财务对账" },
  { value: "OWNER_APPROVAL", label: "OWNER_APPROVAL / 老板批准" },
  { value: "CUSTOMER_REQUEST", label: "CUSTOMER_REQUEST / 客户或家长要求" },
  { value: "OTHER", label: "OTHER / 其他" },
] as const;

export type AbnormalLedgerFields = {
  reasonCategory: string;
  approver: string;
  evidenceNote: string;
  detailNote: string;
};

const HEADER = "[ABNORMAL_TXN]";
const PREFIX_REASON = "Reason Category / 原因分类:";
const PREFIX_APPROVER = "Approver / 审批人:";
const PREFIX_EVIDENCE = "Evidence Note / 证据备注:";
const PREFIX_DETAIL = "Detail / 补充说明:";

function clean(v: unknown) {
  return String(v ?? "").trim();
}

export function isAbnormalTxnKind(kind: string | null | undefined) {
  return ABNORMAL_TXN_KINDS.includes(String(kind ?? "").trim().toUpperCase() as (typeof ABNORMAL_TXN_KINDS)[number]);
}

export function parseAbnormalLedgerNote(note: string | null | undefined): AbnormalLedgerFields {
  const raw = clean(note);
  if (!raw.startsWith(HEADER)) {
    return { reasonCategory: "", approver: "", evidenceNote: "", detailNote: raw };
  }

  const lines = raw.split("\n").map((line) => line.trim());
  const get = (prefix: string) => {
    const hit = lines.find((line) => line.startsWith(prefix));
    return hit ? clean(hit.slice(prefix.length)) : "";
  };

  return {
    reasonCategory: get(PREFIX_REASON),
    approver: get(PREFIX_APPROVER),
    evidenceNote: get(PREFIX_EVIDENCE),
    detailNote: get(PREFIX_DETAIL),
  };
}

export function validateAbnormalLedgerFields(input: Partial<AbnormalLedgerFields>) {
  const reasonCategory = clean(input.reasonCategory);
  const approver = clean(input.approver);
  const evidenceNote = clean(input.evidenceNote);

  if (!reasonCategory) return "Reason category is required / 请填写原因分类";
  if (!ABNORMAL_REASON_OPTIONS.some((x) => x.value === reasonCategory)) {
    return "Invalid reason category / 原因分类无效";
  }
  if (!approver) return "Approver is required / 请填写审批人";
  if (!evidenceNote) return "Evidence note is required / 请填写证据备注";
  return null;
}

export function buildAbnormalLedgerNote(input: Partial<AbnormalLedgerFields>) {
  const reasonCategory = clean(input.reasonCategory);
  const approver = clean(input.approver);
  const evidenceNote = clean(input.evidenceNote);
  const detailNote = clean(input.detailNote);

  return [
    HEADER,
    `${PREFIX_REASON} ${reasonCategory}`,
    `${PREFIX_APPROVER} ${approver}`,
    `${PREFIX_EVIDENCE} ${evidenceNote}`,
    `${PREFIX_DETAIL} ${detailNote || "-"}`,
  ].join("\n");
}
