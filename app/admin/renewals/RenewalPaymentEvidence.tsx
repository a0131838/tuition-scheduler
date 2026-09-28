"use client";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import type { RenewalPaymentCandidate } from "@/lib/renewal-payment-evidence";

type Evidence = { postpaid: boolean; contractInvoiceId: string | null; candidates: RenewalPaymentCandidate[] };
export function RenewalPaymentEvidence({ taskId, invoiceId, packageId, contractId, lang, onSelect, reviewNote, onReviewNote }: {
  packageId: string; contractId: string | null; taskId: string; invoiceId: string | null; lang: Lang; onSelect: (id: string) => void; reviewNote: string; onReviewNote: (note: string) => void;
}) {
  const t = (en: string, zh: string) => lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
  const [data, setData] = useState<Evidence | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError("");
    fetch(`/api/admin/renewals/${taskId}?${new URLSearchParams({ packageId, contractId: contractId || "" })}`, { cache: "no-store", signal: controller.signal })
      .then(async r => { const result = await r.json(); if (!r.ok || result.paymentError) throw new Error(result.paymentError || result.message || "Unable to load evidence / 无法读取凭据"); return result.evidence; })
      .then(setData).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [taskId, packageId, contractId, revision]);
  const selectedId = invoiceId || data?.contractInvoiceId || "";
  const selected = data?.candidates.find(c => c.id === selectedId);
  const stateLabel = (state: string) => ({
    PAID: t("Approved receipts cover this invoice", "已审批收据足额覆盖发票"),
    UNPAID: t("No approved payment", "尚无已审批收款"),
    PARTIAL: t("Partially paid", "仅部分收款"),
    APPROVAL_PENDING: t("Receipt approval pending", "收据待审批"),
    REJECTED: t("Receipt rejected", "收据已退回"),
    INVALID: t("Amount or receipt data needs review", "金额或收据资料需核对"),
  }[state] || state);
  return <details>
    <summary>{t("Payment evidence", "收款凭据核对")}</summary>
    <p>{t("Confirming payment checks the selected invoice and approved receipts again when you save. A signed contract, uploaded payment screenshot or package balance alone does not verify payment.", "保存付款状态时会重新核对所选发票及已审批收据。签约、上传付款截图或课包有余额，都不能单独证明收款。")}</p>
    {error ? <p role="alert">{error}</p> : !data ? <p>{t("Loading evidence…", "正在读取凭据…")}</p> : <>
      {data.postpaid && <p>{t("This package uses partner postpaid settlement. Package activation does not mean payment has been received. Only use Payment confirmed after the relevant invoice is settled with approved receipts.", "本课包采用合作方后付结算。课包生效不代表已收款；对应发票获已审批收据足额覆盖后，才能确认付款。")}</p>}
      <label>{t("Invoice for this renewal", "本次续费对应发票")}
        <select value={selectedId} onChange={e => onSelect(e.target.value)}>
          <option value="">{t("Select an invoice", "请选择对应发票")}</option>
          {selectedId && !selected && <option value={selectedId}>{t("Linked invoice needs review", "已关联发票需要核对")}</option>}
          {data.candidates.map(c => <option key={c.id} value={c.id} disabled={!c.eligible}>{c.invoiceNo} · {c.issueDate} · SGD {c.amountDue.toFixed(2)}{c.requiresReview ? ` · ${t("Review renewal scope", "需核对本次归属")}` : ""}{c.eligible ? "" : ` · ${t("Already used", "已用于其他续费")}`}</option>)}
        </select>
      </label>
      {!data.candidates.length && <p>{t("No current invoice is linked to this student and package. Review the contract and billing records; do not create another invoice merely to clear the task.", "未找到本次续费对应学生及课包的发票。请核对合同和账单记录，不要为了消除待办重复开票。")}</p>}
      {selected && <p role="status">{stateLabel(selected.state)} · {t("Adjusted invoice", "调整后发票金额")}: SGD {selected.amountDue.toFixed(2)} · {t("Approved receipts", "已审批收款")}: SGD {selected.approvedAmount.toFixed(2)}{!selected.eligible && ` · ${t("Already used in another renewal cycle", "已用于另一续费周期")}`}</p>}
      {selected?.requiresReview && <label>{t("Why does this earlier invoice belong to this renewal?", "这张较早发票为何属于本次续费？")}
        <textarea value={reviewNote} onChange={e => onReviewNote(e.target.value)} maxLength={1000} placeholder={t("Record the contract or billing evidence checked (at least 10 characters). Do not confirm if ownership is uncertain.", "记录已核对的合同或账单依据（至少10个字符）。归属不确定时请保留待核对。")}/>
      </label>}
      <p>{t("This check only updates renewal follow-up. It does not collect money, approve receipts or add course hours.", "此处只更新续费跟进状态，不收款、不审批收据、不增加课时。")}</p>
    </>}
    <button type="button" onClick={() => setRevision(r => r + 1)}>{t("Refresh evidence", "刷新凭据")}</button>
  </details>;
}
