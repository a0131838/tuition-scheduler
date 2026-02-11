"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function preserveRefresh(router: ReturnType<typeof useRouter>) {
  const y = window.scrollY;
  router.refresh();
  requestAnimationFrame(() => window.scrollTo(0, y));
}

export default function ManagerEmailAddClient({
  labels,
}: {
  labels: { managerEmail: string; noteOptional: string; addManager: string; errorPrefix: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  return (
    <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
      {err ? (
        <div style={{ color: "#b00", fontSize: 12 }}>
          {labels.errorPrefix}: {err}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12 }}>{labels.managerEmail}</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={{ minWidth: 240 }} disabled={busy} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12 }}>{labels.noteOptional}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={{ minWidth: 220 }} disabled={busy} />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (busy) return;
            setErr("");
            setBusy(true);
            try {
              const res = await fetch("/api/admin/manager/acl", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, note }),
              });
              const data = (await res.json().catch(() => null)) as any;
              if (!res.ok || !data?.ok) {
                setErr(String(data?.message ?? `Request failed (${res.status})`));
                return;
              }
              setEmail("");
              setNote("");
              preserveRefresh(router);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? `${labels.addManager}...` : labels.addManager}
        </button>
      </div>
    </div>
  );
}

