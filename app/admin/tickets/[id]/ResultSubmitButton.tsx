"use client";

import { useFormStatus } from "react-dom";
import type { Lang } from "@/lib/i18n";

export default function ResultSubmitButton({ action, lang = "BILINGUAL" }: { action: (data: FormData) => Promise<void>; lang?: Lang }) {
  const { pending } = useFormStatus();
  const en = pending ? "Verifying, please wait…" : "Verify and update work order";
  const zh = pending ? "正在核验，请稍候…" : "核验并更新工单";
  return <button type="submit" formAction={action} disabled={pending} aria-live="polite">{lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`}</button>;
}
