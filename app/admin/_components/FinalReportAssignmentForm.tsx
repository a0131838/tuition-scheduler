"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { type Lang } from "@/lib/i18n";

function AssignmentFields({ children, style, failed, lang }: {
  children: ReactNode;
  style?: CSSProperties;
  failed: boolean;
  lang: Lang;
}) {
  const { pending } = useFormStatus();
  const label = (en: string, zh: string) => lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
  return <>
    <fieldset disabled={pending || failed} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, ...style }}>
      {children}
    </fieldset>
    {pending ? <p role="status">{label("Assigning… Please wait.", "正在分配，请稍候…")}</p> : null}
  </>;
}

/** Open the saved result as a document, bypassing the faulty action redirect. */
export default function FinalReportAssignmentForm({ action, lang, children, style }: {
  action: (formData: FormData) => Promise<string>;
  lang: Lang;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const inFlight = useRef(false);
  const [failed, setFailed] = useState(false);
  const label = (en: string, zh: string) => lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;

  return (
    <form action={async (formData) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const result = await action(formData);
        const url = new URL(result, window.location.origin);
        if (url.origin !== window.location.origin || url.pathname !== "/admin/reports/final") {
          throw new Error("Invalid assignment result location");
        }
        window.location.assign(url.href);
      } catch {
        // The save may have succeeded even if its response was interrupted.
        // Require a record check instead of offering another submission here.
        setFailed(true);
      }
    }}>
      <AssignmentFields style={style} failed={failed} lang={lang}>{children}</AssignmentFields>
      {failed ? (
        <div role="alert">
          <p>{label("Unable to confirm the result. Check the report records before trying again.", "暂时无法确认处理结果，请先核对报告记录，避免重复分配。")}</p>
          <a href="/admin/reports/final#final-report-records">{label("Open report records", "打开报告记录")}</a>
        </div>
      ) : null}
    </form>
  );
}
