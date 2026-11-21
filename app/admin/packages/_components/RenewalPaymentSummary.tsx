import { t, type Lang } from "@/lib/i18n";
import type { RenewalPaymentOverview } from "@/lib/renewal-payment-overview";

const cashIssues = {
  NO_CASH_RECEIPT: ["Check the payment method and receipt in Package Billing.", "请在课包账单核对付款方式和收据。"],
  CASH_BALANCE_DUE: ["Approved cash receipts cover part of the invoice.", "已审批的现金收据还未覆盖发票全额。"],
  RECEIPT_APPROVAL_PENDING: ["Review the pending cash receipt.", "请审批待处理的现金收据。"],
  CHECK_CASH_RECORD: ["Check the cash payment record linked to the receipt.", "请核对收据所关联的现金付款记录。"],
} as const;

export function cashPaymentInstruction(lang: Lang, status: keyof typeof cashIssues) {
  const [en, zh] = cashIssues[status];
  return t(lang, en, zh);
}

export function renewalPaymentLabel(lang: Lang, current: NonNullable<RenewalPaymentOverview["current"]>) {
  const methods = current.approvedMethods.map(method => method === "Cash" ? t(lang, "Cash", "现金") : method).join(" + ");
  const approved = current.approvedCents / 100;
  const amount = `SGD ${approved.toFixed(2)}`;
  if (current.approvedCents >= current.totalCents && current.totalCents > 0) {
    return t(lang, `${methods ? methods + " · " : ""}${amount} paid in full · Receipt approved`,
      `${methods ? methods + " · " : ""}${amount} 已付清 · 收据已审批`);
  }
  if (current.approvedCents > 0) return t(lang, `${amount} received and approved`, `已收并审批 ${amount}`);
  if (current.pendingCount) return t(lang, "Receipt awaiting approval", "收据待审批");
  return t(lang, "Awaiting payment or receipt", "待付款或登记收据");
}

export default function RenewalPaymentSummary({ overview, lang, signed, cashHref, receiptsHref, contractHref, invoiceApprovalHref }: {
  overview: RenewalPaymentOverview; lang: Lang; signed: boolean; cashHref: string | null;
  receiptsHref: string; contractHref: string | null; invoiceApprovalHref: string | null;
}) {
  const { current, exception, invoiceApproval, activeOrder, minutes, posted } = overview;
  const hours = Number((minutes / 60).toFixed(2));
  const heading = t(lang, "This renewal", "本次续费");
  const hoursText = posted ? t(lang, `${hours} hours added`, `${hours} 小时已入账`) : t(lang, `${hours} hours pending`, `${hours} 小时待入账`);
  let next: { label: string; href?: string } | null = null;
  if (activeOrder && !posted) {
    next = { label: t(lang, "Continue in the renewal order", "打开续费确认单继续处理"), href: `/admin/renewals/orders?id=${encodeURIComponent(activeOrder.id)}` };
  } else if (exception?.status === "REQUESTED" || exception?.status === "APPROVED") {
    next = { label: exception.status === "REQUESTED" ? t(lang, "Cash exception awaiting manager approval", "现金例外待管理审批")
      : t(lang, "Cash exception approved · Finance to add hours", "现金例外已批准 · 待财务入账"), href: cashHref ?? undefined };
  } else if (invoiceApproval === "REJECTED") {
    next = { label: t(lang, "Review why the invoice was returned", "查看发票退回原因"), href: invoiceApprovalHref ?? undefined };
  } else if (current?.pendingCount && current.approvedCents < current.totalCents) {
    next = { label: t(lang, "Review the pending receipts", "查看待审批收据"), href: receiptsHref };
  } else if (current && current.approvedCents < current.totalCents) {
    next = { label: current.cashStatus === "CASH_BALANCE_DUE" ? cashPaymentInstruction(lang, current.cashStatus)
      : t(lang, "Review the remaining payment", "核对尚未付清的金额"), href: receiptsHref };
  } else if (current?.cashStatus === "CHECK_CASH_RECORD" && !posted && !signed) {
    next = { label: cashPaymentInstruction(lang, current.cashStatus), href: receiptsHref };
  } else if (cashHref && !posted && !signed && (!exception || exception.status === "REJECTED")) {
    next = { label: t(lang, "Cash renewal exception · add hours before signing", "现金续费例外｜先加课时，后补签"), href: cashHref };
  } else if (invoiceApproval === "PENDING_MANAGER") {
    next = { label: t(lang, "Invoice awaiting manager approval", "发票待管理审批"), href: invoiceApprovalHref ?? undefined };
  } else if (!current && !posted) {
    next = { label: overview.ambiguous ? t(lang, "Confirm the invoice for this renewal", "请先确认本次续费对应的发票")
      : contractHref ? t(lang, "Open the renewal contract to continue", "打开续费合同继续处理")
      : t(lang, "Confirm the next step with the contract owner", "请与合同负责人确认下一步"), href: contractHref ?? undefined };
  } else if (!signed && !activeOrder) {
    next = { label: contractHref ? t(lang, "Follow up on the parent signature", "跟进家长签署")
      : t(lang, "Contract owner to follow up on the parent signature", "由合同负责人跟进家长签署"), href: contractHref ?? undefined };
  } else if (!posted) {
    next = { label: t(lang, "Ask Finance to check the lesson-hour ledger", "请财务核对课时流水") };
  }
  return <section id="current-renewal" aria-label={heading} style={{ scrollMarginTop: 90, padding: 14, marginBottom: 14, border: "1px solid #bfdbfe", borderRadius: 12, background: "#eff6ff", display: "grid", gap: 6 }}>
    <strong>{heading}{current ? ` · ${current.invoice.invoiceNo}` : ""}</strong>
    <div>{[current && renewalPaymentLabel(lang, current), hoursText, !signed && !activeOrder && t(lang, "Parent signature pending", "家长待签")].filter(Boolean).join("  ·  ")}</div>
    {next ? <div>{next.href ? <a href={next.href}>{next.label}</a> : next.label}</div> : null}
    {cashHref && exception?.status === "ACTIVATED" ? (
      <div><a href={cashHref}>{t(lang, "View cash renewal exception", "查看现金续费例外")}</a></div>
    ) : null}
  </section>;
}
