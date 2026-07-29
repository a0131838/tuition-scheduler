"use client";

import { useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n";

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
};

type PaymentRecordOption = {
  id: string;
  label: string;
};

function label(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

function money(value: number) {
  return Number(value || 0).toFixed(2);
}

const fieldStyle = { width: "100%" };
const readOnlyFieldStyle = {
  width: "100%",
  background: "#f8fafc",
  color: "#0f172a",
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
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id ?? "");
  const [receivedFrom, setReceivedFrom] = useState(invoices[0]?.billTo ?? "");
  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === invoiceId) ?? invoices[0] ?? null,
    [invoiceId, invoices],
  );

  function selectInvoice(nextInvoiceId: string) {
    setInvoiceId(nextInvoiceId);
    const nextInvoice = invoices.find((invoice) => invoice.id === nextInvoiceId);
    setReceivedFrom(nextInvoice?.billTo ?? "");
  }

  const hasIssuedCredit = Number(selectedInvoice?.creditTotalAmount ?? 0) > 0;
  const canCreate = Boolean(selectedInvoice && selectedInvoice.adjustedTotalAmount > 0);

  return (
    <>
      {selectedInvoice ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            border: "1px solid #bfdbfe",
            background: "#f8fbff",
            marginBottom: 12,
          }}
        >
          {[
            [label(lang, "Original invoice", "原发票金额"), selectedInvoice.originalTotalAmount],
            [label(lang, "Issued Credit Notes", "已签发 Credit Note"), selectedInvoice.creditTotalAmount],
            [label(lang, "Receipt net amount", "收据净额"), selectedInvoice.adjustedTotalAmount],
          ].map(([title, value], index) => (
            <div
              key={String(title)}
              style={{
                padding: 10,
                borderLeft: index === 0 ? "none" : "1px solid #bfdbfe",
                minWidth: 0,
              }}
            >
              <div style={{ color: "#475569", fontSize: 12 }}>{title}</div>
              <div style={{ color: index === 2 ? "#166534" : "#0f172a", fontWeight: 800, marginTop: 4 }}>
                SGD {money(Number(value))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {hasIssuedCredit ? (
        <div style={{ border: "1px solid #86efac", background: "#f0fdf4", color: "#166534", padding: 10, marginBottom: 12 }}>
          {label(
            lang,
            `This receipt is automatically reduced by ${selectedInvoice?.creditNoteNos.join(", ") || "the issued Credit Note"}. The server recalculates the net amount again when you submit.`,
            `本收据已自动扣减 ${selectedInvoice?.creditNoteNos.join("、") || "已签发的 Credit Note"}。提交时服务器会再次计算净额。`,
          )}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
        <label>
          {label(lang, "Source Invoice", "来源发票")}
          <select
            name="invoiceId"
            value={selectedInvoice?.id ?? ""}
            onChange={(event) => selectInvoice(event.target.value)}
            required
            style={fieldStyle}
          >
            <option value="" disabled>
              {invoices.length === 0
                ? label(lang, "(No available invoice)", "（无可用发票）")
                : label(lang, "Select an invoice", "请选择发票")}
            </option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoiceNo} / {label(lang, "Net", "净额")} SGD {money(invoice.adjustedTotalAmount)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {label(lang, "Receipt number", "收据号")}
          <input
            name="receiptNo"
            placeholder={label(lang, "Leave blank to auto-generate: InvoiceNo-RC", "留空自动生成：InvoiceNo-RC")}
            style={fieldStyle}
          />
        </label>
        <label>
          {label(lang, "Receipt Date", "收据日期")}
          <input name="receiptDate" type="date" defaultValue={today} style={fieldStyle} />
        </label>
        <label>
          {label(lang, "Received From", "收款对象")}
          <input
            name="receivedFrom"
            value={receivedFrom}
            onChange={(event) => setReceivedFrom(event.target.value)}
            required
            style={fieldStyle}
          />
        </label>
        <label>
          {label(lang, "Paid via", "付款方式")}
          <select name="paidBy" required defaultValue="Paynow" style={fieldStyle}>
            <option value="Paynow">Paynow</option>
            <option value="Cash">Cash</option>
            <option value="Bank transfer">{label(lang, "Bank transfer", "银行转账")}</option>
          </select>
        </label>
        <label>
          {label(lang, "Quantity", "数量")}
          <input name="quantity" type="number" min={1} defaultValue={1} style={fieldStyle} />
        </label>
        <label>
          {label(lang, "Amount", "金额")}
          <input
            name="amount"
            type="number"
            step="0.01"
            value={selectedInvoice?.adjustedAmount ?? 0}
            readOnly
            style={readOnlyFieldStyle}
          />
        </label>
        <label>
          {label(lang, "GST", "消费税")}
          <input
            name="gstAmount"
            type="number"
            step="0.01"
            value={selectedInvoice?.adjustedGstAmount ?? 0}
            readOnly
            style={readOnlyFieldStyle}
          />
        </label>
        <label>
          {label(lang, "Total", "合计")}
          <input
            name="totalAmount"
            type="number"
            step="0.01"
            value={selectedInvoice?.adjustedTotalAmount ?? 0}
            readOnly
            style={readOnlyFieldStyle}
          />
        </label>
        <label>
          {label(lang, "Amount Received", "实收金额")}
          <input
            name="amountReceived"
            type="number"
            step="0.01"
            value={selectedInvoice?.adjustedTotalAmount ?? 0}
            readOnly
            style={readOnlyFieldStyle}
          />
        </label>
        <label>
          {label(lang, "Payment Record", "付款记录")}
          <select name="paymentRecordId" defaultValue="" style={fieldStyle}>
            <option value="">{label(lang, "(none)", "（无）")}</option>
            {paymentRecords.map((record) => (
              <option key={record.id} value={record.id}>
                {record.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          {label(lang, "Additional note", "补充备注")}
          <input
            name="note"
            placeholder={label(
              lang,
              "Credit Note numbers and adjusted net are added automatically",
              "Credit Note 编号及调整后净额将自动写入",
            )}
            style={fieldStyle}
          />
        </label>
      </div>
      <div style={{ marginTop: 8 }}>
        <button
          type="submit"
          disabled={!canCreate}
          style={{
            border: "1px solid #93c5fd",
            background: canCreate ? "#eff6ff" : "#f1f5f9",
            color: canCreate ? "#1e3a8a" : "#94a3b8",
            padding: "8px 12px",
            fontWeight: 700,
          }}
        >
          {label(lang, "Create Receipt", "创建收据")}
        </button>
      </div>
    </>
  );
}
