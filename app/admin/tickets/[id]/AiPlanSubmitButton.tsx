"use client";

import { useState } from "react";

export default function AiPlanSubmitButton({ isReady }: { isReady: boolean }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={() => setPending(true)}
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
