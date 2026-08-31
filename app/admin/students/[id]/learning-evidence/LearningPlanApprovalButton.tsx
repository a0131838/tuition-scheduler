"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LearningPlanApprovalButton({ studentId, planId }: { studentId: string; planId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function approve() {
    setState("saving");
    const response = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}/learning-plans`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      setState("error");
      return;
    }
    router.refresh();
  }

  return <button type="button" onClick={approve} disabled={state === "saving"} style={{ border: "1px solid #16a34a", borderRadius: 8, padding: "6px 9px", background: "#f0fdf4", color: "#166534", fontWeight: 800, cursor: state === "saving" ? "wait" : "pointer" }}>{state === "saving" ? "Approving…" : state === "error" ? "Retry approval" : "Approve plan / 批准计划"}</button>;
}
