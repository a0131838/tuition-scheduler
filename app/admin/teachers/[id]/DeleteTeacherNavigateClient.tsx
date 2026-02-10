"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteTeacherNavigateClient({
  teacherId,
  label,
  confirmMessage,
  to,
}: {
  teacherId: string;
  label: string;
  confirmMessage: string;
  to: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div style={{ display: "grid", gap: 6, marginBottom: 24 }}>
      {err ? <div style={{ color: "#b00", fontSize: 12 }}>{err}</div> : null}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          if (!confirm(confirmMessage)) return;
          setErr("");
          setBusy(true);
          try {
            const res = await fetch(`/api/admin/teachers/${encodeURIComponent(teacherId)}`, { method: "DELETE" });
            const data = (await res.json().catch(() => null)) as any;
            if (!res.ok || !data?.ok) {
              setErr(String(data?.message ?? `Request failed (${res.status})`));
              return;
            }
            router.push(to);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? `${label}...` : label}
      </button>
    </div>
  );
}

