"use client";

import { useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n";

function choose(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

function money(value: number) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function roundMoney(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export default function ReceiptAmountReceivedField({
  lang,
  defaultValue,
  remainingAmount,
  suggestedProofLabel,
}: {
  lang: Lang;
  defaultValue: number;
  remainingAmount: number;
  suggestedProofLabel?: string | null;
}) {
  const [value, setValue] = useState(String(defaultValue));
  const numericValue = Number(value);
  const isValidNumber = Number.isFinite(numericValue);
  const delta = isValidNumber ? roundMoney(numericValue - remainingAmount) : 0;

  const hint = useMemo(() => {
    if (!isValidNumber) {
      return {
        tone: "warn",
        text: choose(lang, "Enter a valid amount before creating the receipt.", "创建收据前请先输入有效金额。"),
      };
    }
    if (delta > 0.01) {
      return {
        tone: "danger",
        text: choose(
          lang,
          `This amount exceeds the remaining balance by SGD ${money(delta)}. Stop and verify before submitting.`,
          `当前金额比剩余待开金额多 SGD ${money(delta)}。提交前请先停下来核对。`
        ),
      };
    }
    if (delta < -0.01) {
      return {
        tone: "warn",
        text: choose(
          lang,
          `This will leave SGD ${money(Math.abs(delta))} for another receipt. Confirm this is an intentional split payment.`,
          `这样会留下 SGD ${money(Math.abs(delta))} 给下一张收据。请确认这是有意的分次收款。`
        ),
      };
    }
    return {
      tone: "ok",
      text: choose(lang, "This matches the remaining balance and will fully clear the invoice receipt side.", "这个金额与剩余待开金额一致，会把该发票的收据部分补齐。"),
    };
  }, [delta, isValidNumber, lang]);

  const hintStyle =
    hint.tone === "danger"
      ? { color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5" }
      : hint.tone === "warn"
        ? { color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d" }
        : { color: "#166534", background: "#ecfdf5", border: "1px solid #86efac" };

  return (
    <label>
      {choose(lang, "Amount Received", "实收金额")} *
      <input
        name="amountReceived"
        required
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        style={{ width: "100%" }}
      />
      <div style={{ marginTop: 6, fontSize: 12, borderRadius: 8, padding: "6px 8px", ...hintStyle }}>
        {hint.text}
      </div>
      {suggestedProofLabel ? (
        <div style={{ marginTop: 4, fontSize: 12, color: "#475569" }}>
          {choose(lang, "Suggested proof", "推荐凭证")}: {suggestedProofLabel}
        </div>
      ) : null}
    </label>
  );
}
