"use client";

import { useState } from "react";

type Props = {
  packageId: string;
  txnId: string;
  defaultDelta: number;
  defaultNote: string;
  labels: {
    delta: string;
    note: string;
    save: string;
    saving: string;
    errorPrefix: string;
  };
};

export default function PackageLedgerEditTxnClient(props: Props) {
  const [delta, setDelta] = useState(String(props.defaultDelta));
  const [note, setNote] = useState(props.defaultNote);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (saving) return;
    setSaving(true);
    try {
      const deltaNum = Number(delta);
      const res = await fetch(
        `/api/admin/packages/${encodeURIComponent(props.packageId)}/ledger/txns/${encodeURIComponent(props.txnId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deltaMinutes: deltaNum, note }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        alert(`${props.labels.errorPrefix}: ${data?.message ?? `HTTP ${res.status}`}`);
        return;
      }
      window.location.href = `/admin/packages/${encodeURIComponent(props.packageId)}/ledger?msg=${encodeURIComponent(
        "Txn updated"
      )}`;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input
        type="number"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        style={{ width: 90 }}
        title={props.labels.delta}
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ width: 180 }}
        title={props.labels.note}
      />
      <button type="button" onClick={onSave} disabled={saving}>
        {saving ? props.labels.saving : props.labels.save}
      </button>
    </div>
  );
}

