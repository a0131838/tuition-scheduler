"use client";

import { useRef, useState } from "react";

type Labels = {
  edit: string;
  update: string;
  deleteLabel: string;
  paid: string;
  paidAt: string;
  paidAmount: string;
  paidNote: string;
  remaining: string;
  validFrom: string;
  validTo: string;
  status: string;
  note: string;
  close: string;
  deleteConfirm: string;
};

type PackageRow = {
  id: string;
  remainingMinutes: number | null;
  validFrom: Date;
  validTo: Date | null;
  status: string;
  paid: boolean;
  paidAt: Date | null;
  paidAmount: number | null;
  paidNote: string | null;
  note: string | null;
};

export default function PackageEditModal({
  pkg,
  onUpdate,
  onDelete,
  labels,
}: {
  pkg: PackageRow;
  onUpdate: (formData: FormData) => void;
  onDelete: (formData: FormData) => void;
  labels: Labels;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [hover, setHover] = useState(false);

  return (
    <>
      <span
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        <button
          type="button"
          title={labels.edit}
          onClick={() => dialogRef.current?.showModal()}
          style={{
            opacity: hover ? 1 : 0.7,
            border: "1px solid #f0b266",
            borderRadius: 6,
            padding: "4px 8px",
            cursor: "pointer",
            background: hover ? "#fff3e0" : "#fff7ed",
            fontSize: 13,
            fontWeight: 700,
            color: "#b45309",
          }}
        >
          ✎ {labels.edit}
        </button>
      </span>
      <dialog ref={dialogRef} style={{ padding: 16, borderRadius: 8, border: "1px solid #ddd", minWidth: 420 }}>
        <form method="dialog" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b>{labels.edit}</b>
          <button type="submit">{labels.close}</button>
        </form>

        <form action={onUpdate} style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <input type="hidden" name="id" value={pkg.id} />
          <label>
            {labels.remaining}:
            <input
              name="remainingMinutes"
              type="number"
              min={0}
              defaultValue={pkg.remainingMinutes ?? ""}
              style={{ marginLeft: 8 }}
            />
          </label>
          <label>
            {labels.validFrom}:
            <input name="validFrom" type="date" defaultValue={pkg.validFrom.toISOString().slice(0, 10)} style={{ marginLeft: 8 }} />
          </label>
          <label>
            {labels.validTo}:
            <input name="validTo" type="date" defaultValue={pkg.validTo ? pkg.validTo.toISOString().slice(0, 10) : ""} style={{ marginLeft: 8 }} />
          </label>
          <label>
            {labels.status}:
            <select name="status" defaultValue={pkg.status} style={{ marginLeft: 8 }}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" name="paid" defaultChecked={pkg.paid} />
            {labels.paid}
          </label>
          <label>
            {labels.paidAt}:
            <input
              name="paidAt"
              type="datetime-local"
              defaultValue={pkg.paidAt ? pkg.paidAt.toISOString().slice(0, 16) : ""}
              style={{ marginLeft: 8 }}
            />
          </label>
          <label>
            {labels.paidAmount}:
            <input name="paidAmount" type="number" min={0} step={1} defaultValue={pkg.paidAmount ?? ""} style={{ marginLeft: 8 }} />
          </label>
          <label>
            {labels.paidNote}:
            <input name="paidNote" type="text" defaultValue={pkg.paidNote ?? ""} style={{ marginLeft: 8, width: "100%" }} />
          </label>
          <label>
            {labels.note}:
            <input name="note" type="text" defaultValue={pkg.note ?? ""} style={{ marginLeft: 8, width: "100%" }} />
          </label>

          <button type="submit">{labels.update}</button>
        </form>

        <form
          action={onDelete}
          onSubmit={(e) => {
            if (!window.confirm(labels.deleteConfirm)) e.preventDefault();
          }}
          style={{ marginTop: 12 }}
        >
          <input type="hidden" name="id" value={pkg.id} />
          <button type="submit" style={{ color: "#b00" }}>
            {labels.deleteLabel}
          </button>
        </form>
      </dialog>
    </>
  );
}
