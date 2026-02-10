"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingRequestActionsClient({
  linkId,
  requestId,
  labels,
}: {
  linkId: string;
  requestId: string;
  labels: {
    approve: string;
    reject: string;
    rejectNote: string;
    errorPrefix: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  const preserveRefresh = () => {
    const y = window.scrollY;
    router.refresh();
    requestAnimationFrame(() => window.scrollTo(0, y));
  };

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {err ? (
        <div style={{ color: "#b00", fontSize: 12 }}>
          {labels.errorPrefix}: {err}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (busy) return;
            setErr("");
            setBusy(true);
            try {
              const res = await fetch(
                `/api/admin/booking-links/${encodeURIComponent(linkId)}/requests/${encodeURIComponent(requestId)}/approve`,
                {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ note: "" }),
                }
              );
              const data = (await res.json().catch(() => null)) as any;
              if (!res.ok || !data?.ok) {
                setErr(String(data?.message ?? `Request failed (${res.status})`));
                return;
              }
              preserveRefresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? `${labels.approve}...` : labels.approve}
        </button>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={labels.rejectNote}
          style={{ minWidth: 180 }}
          disabled={busy}
        />
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (busy) return;
            setErr("");
            setBusy(true);
            try {
              const res = await fetch(
                `/api/admin/booking-links/${encodeURIComponent(linkId)}/requests/${encodeURIComponent(requestId)}/reject`,
                {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ note }),
                }
              );
              const data = (await res.json().catch(() => null)) as any;
              if (!res.ok || !data?.ok) {
                setErr(String(data?.message ?? `Request failed (${res.status})`));
                return;
              }
              preserveRefresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? `${labels.reject}...` : labels.reject}
        </button>
      </div>
    </div>
  );
}

