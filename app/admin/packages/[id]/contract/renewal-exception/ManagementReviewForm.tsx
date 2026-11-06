"use client";

import { useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { Lang } from "@/lib/i18n";

function ReviewFields({ children, failed, pendingLabel }: { children: ReactNode; failed: boolean; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <>
    <fieldset disabled={pending || failed} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "grid", gap: 10 }}>{children}</fieldset>
    {pending ? <p role="status">{pendingLabel}</p> : null}
  </>;
}

export default function ManagementReviewForm({ action, lang, reviewPath, contractId, children }: {
  action: (formData: FormData) => Promise<string>;
  lang: Lang;
  reviewPath: string;
  contractId: string;
  children: ReactNode;
}) {
  const inFlight = useRef(false);
  const [failed, setFailed] = useState(false);
  const label = (en: string, zh: string) => lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
  return <form action={async (formData) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = new URL(await action(formData), window.location.origin);
      if (result.origin !== window.location.origin || result.pathname !== reviewPath || result.searchParams.get("contractId") !== contractId) {
        throw new Error("Invalid management review result location");
      }
      // Load the saved result as a document; action redirects can leave stale controls visible.
      result.hash = "renewal-result";
      window.location.assign(result.href);
    } catch {
      // A lost response does not prove that the management decision failed to save.
      setFailed(true);
    }
  }}>
    <ReviewFields failed={failed} pendingLabel={label("Saving management decision… Please wait.", "正在保存管理审批结果，请稍候…")}>{children}</ReviewFields>
    {failed ? <div role="alert">
      <p>{label("Unable to confirm the result. Reopen this renewal and check its status before trying again.", "暂时无法确认审批结果。请重新打开本次续费核对状态，避免重复审批。")}</p>
      <a href={`${reviewPath}?${new URLSearchParams({ contractId })}`}>{label("Reopen renewal and check status", "重新打开续费并核对状态")}</a>
    </div> : null}
  </form>;
}
