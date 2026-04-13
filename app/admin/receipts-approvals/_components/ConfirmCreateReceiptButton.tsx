"use client";

import type { MouseEvent } from "react";
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

export default function ConfirmCreateReceiptButton({
  lang,
  disabled,
  remainingAmount,
  suggestedProofAmount,
}: {
  lang: Lang;
  disabled?: boolean;
  remainingAmount: number;
  suggestedProofAmount?: number | null;
}) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    if (!form) return;
    const amountField = form.elements.namedItem("amountReceived");
    if (!(amountField instanceof HTMLInputElement)) return;
    const raw = amountField.value.trim();
    const amount = Number(raw);
    if (!Number.isFinite(amount)) return;

    const warnings: string[] = [];
    const remainingDelta = roundMoney(amount - remainingAmount);
    if (remainingDelta > 0.01) {
      warnings.push(
        choose(
          lang,
          `Amount Received is SGD ${money(remainingDelta)} above the invoice remaining balance.`,
          `实收金额比发票剩余待开金额高 SGD ${money(remainingDelta)}。`
        )
      );
    } else if (remainingDelta < -0.01) {
      warnings.push(
        choose(
          lang,
          `Amount Received is SGD ${money(Math.abs(remainingDelta))} below the invoice remaining balance and will leave another receipt open.`,
          `实收金额比发票剩余待开金额低 SGD ${money(Math.abs(remainingDelta))}，提交后仍会留下下一张收据。`
        )
      );
    }

    if (suggestedProofAmount != null) {
      const proofDelta = roundMoney(amount - suggestedProofAmount);
      if (Math.abs(proofDelta) > 0.01) {
        warnings.push(
          proofDelta > 0
            ? choose(
                lang,
                `Amount Received is SGD ${money(proofDelta)} above the selected payment proof amount.`,
                `实收金额比所选付款凭证金额高 SGD ${money(proofDelta)}。`
              )
            : choose(
                lang,
                `Amount Received is SGD ${money(Math.abs(proofDelta))} below the selected payment proof amount.`,
                `实收金额比所选付款凭证金额低 SGD ${money(Math.abs(proofDelta))}。`
              )
        );
      }
    }

    if (warnings.length === 0) return;
    const message = `${choose(lang, "Please confirm before creating this receipt:", "创建这张收据前请再次确认：")}\n\n- ${warnings.join("\n- ")}\n\n${choose(lang, "Press OK to continue, or Cancel to review the form.", "点确定继续创建，或点取消返回表单检查。")}`;
    if (!window.confirm(message)) {
      event.preventDefault();
    }
  };

  return (
    <button type="submit" disabled={disabled} onClick={handleClick}>
      {choose(lang, "Create Receipt", "创建收据")}
    </button>
  );
}
