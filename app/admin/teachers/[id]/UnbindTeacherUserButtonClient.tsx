"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnbindTeacherUserButtonClient({
  teacherId,
  userId,
  label,
  confirmMessage,
}: {
  teacherId: string;
  userId: string;
  label: string;
  confirmMessage: string;
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
            const res = await fetch(`/api/admin/teachers/${encodeURIComponent(teacherId)}/user/unbind`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ userId }),
            });
            const data = (await res.json().catch(() => null)) as any;
            if (!res.ok || !data?.ok) {
              setErr(String(data?.message ?? `Request failed (${res.status})`));
              return;
            }
            const y = window.scrollY;
            router.refresh();
            requestAnimationFrame(() => window.scrollTo(0, y));
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

