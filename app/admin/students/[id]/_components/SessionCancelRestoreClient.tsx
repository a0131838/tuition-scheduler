"use client";

import { useState } from "react";

async function jsonOrNull(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function SessionCancelRestoreClient(props: {
  studentId: string;
  sessionId: string;
  initialCancelled: boolean;
  initialCharge?: boolean;
  variant: "compact" | "full";
  labels: {
    cancel: string;
    restore: string;
    restoreConfirm: string;
    charge: string;
    note: string;
  };
}) {
  const { studentId, sessionId, initialCancelled, initialCharge, variant, labels } = props;
  const [cancelled, setCancelled] = useState(initialCancelled);
  const [charge, setCharge] = useState(Boolean(initialCharge));
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doneMsg, setDoneMsg] = useState("");

  const doCancel = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    setDoneMsg("");
    try {
      const res = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}/sessions/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, charge, note }),
      });
      const data = await jsonOrNull(res);
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Cancel failed"));
      setCancelled(true);
      setDoneMsg("OK");
    } catch (e: any) {
      setError(String(e?.message ?? "Cancel failed"));
    } finally {
      setLoading(false);
    }
  };

  const doRestore = async () => {
    if (loading) return;
    if (!window.confirm(labels.restoreConfirm)) return;
    setLoading(true);
    setError("");
    setDoneMsg("");
    try {
      const res = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}/sessions/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await jsonOrNull(res);
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Restore failed"));
      setCancelled(false);
      setDoneMsg("OK");
    } catch (e: any) {
      setError(String(e?.message ?? "Restore failed"));
    } finally {
      setLoading(false);
    }
  };

  if (cancelled) {
    return (
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={doRestore} disabled={loading}>
          {loading ? "..." : labels.restore}
        </button>
        {doneMsg ? <span style={{ color: "#166534", fontSize: 12 }}>{doneMsg}</span> : null}
        {error ? <span style={{ color: "#b00", fontSize: 12 }}>{error}</span> : null}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button
        type="button"
        title={variant === "compact" ? labels.cancel : undefined}
        onClick={doCancel}
        disabled={loading}
        style={
          variant === "compact"
            ? {
                border: "1px solid #f0b266",
                background: "#fff7ed",
                color: "#b45309",
                borderRadius: 6,
                padding: "2px 6px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }
            : undefined
        }
      >
        {loading ? "..." : variant === "compact" ? "x" : labels.cancel}
      </button>
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: variant === "compact" ? 11 : 12 }}>
        <input type="checkbox" checked={charge} onChange={(e) => setCharge(e.target.checked)} />
        {labels.charge}
      </label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={labels.note}
        style={variant === "compact" ? { fontSize: 11, padding: "2px 4px", width: 90 } : { minWidth: 160 }}
      />
      {doneMsg ? <span style={{ color: "#166534", fontSize: 12 }}>{doneMsg}</span> : null}
      {error ? <span style={{ color: "#b00", fontSize: 12 }}>{error}</span> : null}
    </span>
  );
}

