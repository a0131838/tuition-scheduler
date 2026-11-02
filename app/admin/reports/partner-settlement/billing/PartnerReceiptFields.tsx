"use client";
import { useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { PARTNER_RECEIVING_ENTITY } from "@/lib/partner-receipt-calculation";
export type PartnerReceiptInvoiceOption = {
  id: string;
  invoiceNo: string;
  billTo: string;
  originalTotalAmount: number;
  creditTotalAmount: number;
  adjustedAmount: number;
  adjustedGstAmount: number;
  adjustedTotalAmount: number;
  creditNoteNos: string[];
  approvedAmount: number;
  pendingAmount: number;
  remainingAmount: number;
  availableAmount: number;
};
type PaymentRecordOption = { id: string; label: string };
function label(lang: Lang, en: string, zh: string) {
  return lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
}
const money = (v: number) => Number(v || 0).toFixed(2);
const fieldStyle = { width: "100%" };
const readOnlyFieldStyle = {
  width: "100%",
  background: "#f8fafc",
  fontWeight: 700,
};
export function PartnerReceiptFields({
  lang,
  today,
  invoices,
  paymentRecords,
}: {
  lang: Lang;
  today: string;
  invoices: PartnerReceiptInvoiceOption[];
  paymentRecords: PaymentRecordOption[];
}) {
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id || ""),
    [receivedFrom, setReceivedFrom] = useState(invoices[0]?.billTo || ""),
    [received, setReceived] = useState(
      String(invoices[0]?.availableAmount ?? ""),
    );
  const selectedInvoice = useMemo(
    () => invoices.find((i) => i.id === invoiceId) || invoices[0] || null,
    [invoiceId, invoices],
  );
  function selectInvoice(id: string) {
    setInvoiceId(id);
    const next = invoices.find((i) => i.id === id);
    setReceivedFrom(next?.billTo || "");
    setReceived(String(next?.availableAmount ?? ""));
  }
  const canCreate = Boolean(
    selectedInvoice &&
      Number(received) > 0 &&
      Number(received) <= selectedInvoice.availableAmount,
  );
  return (
    <>
      {selectedInvoice ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            border: "1px solid #bfdbfe",
            background: "#f8fbff",
            marginBottom: 12,
          }}
        >
          {[
            [
              label(lang, "Original invoice", "原发票金额"),
              selectedInvoice.originalTotalAmount,
            ],
            [
              label(lang, "Issued Credit Notes", "已签发Credit Note"),
              selectedInvoice.creditTotalAmount,
            ],
            [
              label(lang, "Net receivable", "净应收"),
              selectedInvoice.adjustedTotalAmount,
            ],
            [
              label(lang, "Approved received", "已审批收款"),
              selectedInvoice.approvedAmount,
            ],
            [
              label(lang, "Pending approval", "待审收款"),
              selectedInvoice.pendingAmount,
            ],
            [
              label(lang, "Available for this receipt", "本次可收金额"),
              selectedInvoice.availableAmount,
            ],
          ].map(([name, value]) => (
            <div key={String(name)} style={{ padding: 10 }}>
              <div style={{ fontSize: 12 }}>{name}</div>
              <strong>SGD {money(Number(value))}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p>
          {label(
            lang,
            "No invoice has an available balance. Review existing and pending receipts below.",
            "暂无可新增收据的余额，请核对已有及待审收据。",
          )}
        </p>
      )}
      <p>
        {label(
          lang,
          "Enter only the amount actually received for this payment. Pending receipts reserve the balance; the server checks it again on submission.",
          "仅填写本笔实际到账金额。待审收据会占用可新增余额，提交时服务器会重新核对。",
        )}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 8,
        }}
      >
        <label>
          {label(lang, "Source Invoice", "来源发票")}
          <select
            name="invoiceId"
            value={selectedInvoice?.id || ""}
            onChange={(event) => selectInvoice(event.target.value)}
            required
            style={fieldStyle}
          >
            <option value="" disabled>
              {label(lang, "Select an invoice", "请选择发票")}
            </option>
            {invoices.map((i) => (
              <option key={i.id} value={i.id}>
                {i.invoiceNo} / {label(lang, "Available", "可收")} SGD{" "}
                {money(i.availableAmount)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {label(lang, "Receipt number", "收据号")}
          <input
            name="receiptNo"
            placeholder={label(
              lang,
              "Leave blank: InvoiceNo-RC-01, -02…",
              "留空自动编号：InvoiceNo-RC-01、-02…",
            )}
            style={fieldStyle}
          />
        </label>
        <label>
          {label(lang, "Receipt Date", "收据日期")}
          <input
            name="receiptDate"
            type="date"
            defaultValue={today}
            required
            style={fieldStyle}
          />
        </label>
        <label>
          {label(lang, "Actual payer / Received From", "实际付款公司／付款方")}
          <input
            name="receivedFrom"
            value={receivedFrom}
            onChange={(e) => setReceivedFrom(e.target.value)}
            required
            maxLength={300}
            style={fieldStyle}
          />
        </label>
        <label>
          {label(lang, "Receiving entity", "收款主体")}
          <input
            name="receivingEntity"
            value={PARTNER_RECEIVING_ENTITY}
            readOnly
            style={readOnlyFieldStyle}
          />
        </label>
        <label>
          {label(lang, "Paid via", "付款方式")}
          <select
            name="paidBy"
            required
            defaultValue="Paynow"
            style={fieldStyle}
          >
            <option value="Paynow">Paynow</option>
            <option value="Cash">Cash</option>
            <option value="Bank transfer">
              {label(lang, "Bank transfer", "银行转账")}
            </option>
          </select>
        </label>
        <label>
          {label(lang, "Quantity", "数量")}
          <input
            name="quantity"
            type="number"
            min={1}
            defaultValue={1}
            style={fieldStyle}
          />
        </label>
        <label>
          {label(lang, "Invoice net subtotal", "发票净额（不含税）")}
          <input
            type="number"
            value={selectedInvoice?.adjustedAmount || 0}
            readOnly
            style={readOnlyFieldStyle}
          />
        </label>
        <label>
          {label(lang, "Invoice net GST", "发票净税额")}
          <input
            type="number"
            value={selectedInvoice?.adjustedGstAmount || 0}
            readOnly
            style={readOnlyFieldStyle}
          />
        </label>
        <label>
          {label(lang, "Invoice net total", "发票净合计")}
          <input
            type="number"
            value={selectedInvoice?.adjustedTotalAmount || 0}
            readOnly
            style={readOnlyFieldStyle}
          />
        </label>
        <label>
          {label(lang, "Amount Received this payment", "本笔实收金额")}
          <input
            name="amountReceived"
            type="number"
            min="0.01"
            max={selectedInvoice?.availableAmount ?? 0}
            step="0.01"
            value={received}
            onChange={(e) => setReceived(e.target.value)}
            required
            style={fieldStyle}
          />
        </label>
        <label>
          {label(lang, "Payment Record / evidence", "付款记录／凭证")}
          <select name="paymentRecordId" defaultValue="" style={fieldStyle}>
            <option value="">{label(lang, "(none)", "（无）")}</option>
            {paymentRecords.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ gridColumn: "1/-1" }}>
          {label(lang, "Additional note", "补充备注")}
          <input
            name="note"
            maxLength={2000}
            placeholder={label(
              lang,
              "For example: payment on behalf of the original invoice customer",
              "例如：本公司代原发票客户支付本笔款项",
            )}
            style={fieldStyle}
          />
        </label>
      </div>
      <p style={{ fontSize: 12 }}>
        {label(
          lang,
          "This receipt is issued by GTEI. If funds went to another entity, contact finance administration before issuing. Subtotal and GST for this payment are allocated automatically without changing the invoice.",
          "本收据由GTEI开具。如款项进入其他主体，请先联系财务管理员核对。本笔收款的不含税金额及税额自动分配，不修改原发票。",
        )}
      </p>
      <button type="submit" disabled={!canCreate}>
        {label(lang, "Create Receipt", "创建收据")}
      </button>
    </>
  );
}
