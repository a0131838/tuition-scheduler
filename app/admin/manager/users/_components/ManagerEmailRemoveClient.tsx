"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function preserveRefresh(router: ReturnType<typeof useRouter>) {
  const y = window.scrollY;
  router.refresh();
  requestAnimationFrame(() => window.scrollTo(0, y));
}

export default function ManagerEmailRemoveClient({
  id,
  confirmMessage,
  label,
  errorPrefix,
}: {
  id: string;
  confirmMessage: string;
  label: string;
  errorPrefix: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {err ? (
        <div style={{ color: "#b00", fontSize: 12 }}>
          {errorPrefix}: {err}
        </div>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setErr("");
          if (!confirm(confirmMessage)) return;
          setBusy(true);
          try {
            const res = await fetch(`/api/admin/manager/acl/${encodeURIComponent(id)}`, { method: "DELETE" });
            const data = (await res.json().catch(() => null)) as any;
            if (!res.ok || !data?.ok) {
              setErr(String(data?.message ?? `Request failed (${res.status})`));
              return;
            }
            preserveRefresh(router);
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

