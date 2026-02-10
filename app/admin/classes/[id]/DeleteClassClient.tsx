"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NoticeBanner from "../../_components/NoticeBanner";

export default function DeleteClassClient({
  classId,
  confirmMessage,
  label,
  labels,
}: {
  classId: string;
  confirmMessage: string;
  label: string;
  labels: { ok: string; error: string };
}) {
  const router = useRouter();
  const [err, setErr] = useState("");

  async function del() {
    if (!confirm(confirmMessage)) return;
    setErr("");
    const res = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Delete class failed"));
      return;
    }
    router.push("/admin/classes");
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {err ? <NoticeBanner type="error" title={labels.error} message={err} /> : null}
      <button type="button" onClick={del} style={{ color: "#b00" }}>
        {label}
      </button>
    </div>
  );
}

