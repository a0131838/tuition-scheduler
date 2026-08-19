"use client";

import { useFormStatus } from "react-dom";

export default function AiPlanSubmitButton({ isReady }: { isReady: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-live="polite"
      style={{
        padding: "10px 15px",
        background: pending ? "#9a3412" : "#ea580c",
        color: "#fff",
        fontWeight: 850,
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.82 : 1,
      }}
    >
      {pending ? "AI正在读取，请稍候…" : isReady ? "按最新数据重新生成AI建议" : "让AI读取并生成建议"}
    </button>
  );
}
