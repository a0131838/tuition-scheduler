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
    remove: string;
    removing: string;
    confirmRemove: string;
    undoRemove: string;
    undoing: string;
    removedHint: string;
    errorPrefix: string;
  };
};

export default function PackageLedgerEditTxnClient(props: Props) {
  const [delta, setDelta] = useState(String(props.defaultDelta));
  const [note, setNote] = useState(props.defaultNote);
  const [saving, setSaving] = useState(false);
  const [deletedPayload, setDeletedPayload] = useState<{
    kind: string;
    deltaMinutes: number;
    sessionId: string | null;
    note: string;
  } | null>(null);

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

  async function onDelete() {
    if (saving) return;
    if (!window.confirm(props.labels.confirmRemove)) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/packages/${encodeURIComponent(props.packageId)}/ledger/txns/${encodeURIComponent(props.txnId)}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        alert(`${props.labels.errorPrefix}: ${data?.message ?? `HTTP ${res.status}`}`);
        return;
      }
      if (data?.deleted) {
        setDeletedPayload({
          kind: String(data.deleted.kind ?? ""),
          deltaMinutes: Number(data.deleted.deltaMinutes ?? 0),
          sessionId: data.deleted.sessionId ? String(data.deleted.sessionId) : null,
          note: String(data.deleted.note ?? ""),
        });
      } else {
        window.location.href = `/admin/packages/${encodeURIComponent(props.packageId)}/ledger?msg=${encodeURIComponent(
          "Txn deleted"
        )}`;
      }
    } finally {
      setSaving(false);
    }
  }

  async function onUndoDelete() {
    if (saving || !deletedPayload) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/packages/${encodeURIComponent(props.packageId)}/ledger/txns/${encodeURIComponent(props.txnId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(deletedPayload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        alert(`${props.labels.errorPrefix}: ${data?.message ?? `HTTP ${res.status}`}`);
        return;
      }
      window.location.href = `/admin/packages/${encodeURIComponent(props.packageId)}/ledger?msg=${encodeURIComponent(
        "Txn restored"
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
        disabled={saving || !!deletedPayload}
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ width: 180 }}
        title={props.labels.note}
        disabled={saving || !!deletedPayload}
      />
      <button type="button" onClick={onSave} disabled={saving || !!deletedPayload}>
        {saving ? props.labels.saving : props.labels.save}
      </button>
      <button type="button" onClick={onDelete} disabled={saving || !!deletedPayload} style={{ color: "#b91c1c" }}>
        {saving ? props.labels.removing : props.labels.remove}
      </button>
      {deletedPayload ? (
        <>
          <span style={{ color: "#b45309", fontSize: 12 }}>{props.labels.removedHint}</span>
          <button type="button" onClick={onUndoDelete} disabled={saving}>
            {saving ? props.labels.undoing : props.labels.undoRemove}
          </button>
        </>
      ) : null}
    </div>
  );
}
