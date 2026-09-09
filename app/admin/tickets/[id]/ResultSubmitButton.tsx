"use client";

import { useFormStatus } from "react-dom";

export default function ResultSubmitButton({ action }: { action: (data: FormData) => Promise<void> }) {
  const { pending } = useFormStatus();
  return <button type="submit" formAction={action} disabled={pending} aria-live="polite">{pending ? "正在核验，请稍候…" : "核验并更新工单"}</button>;
}
