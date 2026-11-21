import { t, type Lang } from "@/lib/i18n";
import type { PaidRenewalFollowUp } from "@/lib/paid-renewal-followups";

function nextAction(lang: Lang, row: PaidRenewalFollowUp) {
  if (row.invoiceApproval === "PENDING_MANAGER") {
    return t(lang, "Manager to approve the invoice", "管理审批人批准发票");
  }
  if (row.invoiceApproval !== "APPROVED") {
    return t(lang, "Finance to review the invoice approval", "财务核对发票审批");
  }
  return row.needsSigningLink
    ? t(lang, "Contract owner to prepare a valid signing link", "合同负责人更新签署链接")
    : t(lang, "Contract owner to follow up with the parent", "合同负责人跟进家长签署");
}

export default function PaidRenewalFollowUps({ lang, rows }: { lang: Lang; rows: PaidRenewalFollowUp[] }) {
  const title = t(lang, "Paid renewals awaiting signature", "已付款、待家长签署");
  return (
    <section
      id="paid-renewals-awaiting-signature"
      aria-label={title}
      style={{ border: "1px solid #bfdbfe", borderRadius: 14, background: "#f8fbff", padding: 14, scrollMarginTop: 90 }}
    >
      <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>{title} · {rows.length}</h2>
      {rows.length ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {rows.map(row => (
            <li key={row.contractId} style={{ background: "#fff", border: "1px solid #dbe4f0", borderRadius: 10, padding: 12, display: "grid", gap: 5 }}>
              <strong>{row.studentName} · {row.courseName}</strong>
              <div>{row.invoiceNo} · {row.methods.join(" + ")} · SGD {row.amount.toFixed(2)} {t(lang, "paid in full", "已付清")}</div>
              <div style={{ color: "#92400e" }}>{t(lang, `${row.hours} hours pending`, `${row.hours} 小时待入账`)}</div>
              <div>{nextAction(lang, row)}</div>
              <a href={`/admin/packages/${encodeURIComponent(row.packageId)}/billing#current-renewal`}>
                {t(lang, "Open Package Billing", "打开课包账单")}
              </a>
            </li>
          ))}
        </ul>
      ) : <div style={{ color: "#475569" }}>{t(lang, "No paid renewals awaiting signature.", "目前没有已付款待签署的续费。")}</div>}
    </section>
  );
}
