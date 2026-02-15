"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Labels = {
  edit: string;
  update: string;
  topUp: string;
  topUpMinutes: string;
  topUpNote: string;
  topUpSubmit: string;
  deleteLabel: string;
  paid: string;
  paidAt: string;
  paidAmount: string;
  paidNote: string;
  sharedStudents: string;
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
  sharedStudents: Array<{ studentId: string }>;
  note: string | null;
};

export default function PackageEditModal({
  pkg,
  students,
  labels,
}: {
  pkg: PackageRow;
  students: Array<{ id: string; name: string }>;
  labels: Labels;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [hover, setHover] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const preserveRefresh = (okMsg?: string) => {
    if (okMsg) {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.delete("err");
      params.set("msg", okMsg);
      const target = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(target, { scroll: false });
    }
    const y = window.scrollY;
    router.refresh();
    requestAnimationFrame(() => window.scrollTo(0, y));
  };

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
      <dialog
        ref={dialogRef}
        style={{ padding: 16, borderRadius: 8, border: "1px solid #ddd", minWidth: 420 }}
        onClose={() => {
          setErr("");
          setMsg("");
          setContentKey((v) => v + 1);
        }}
      >
        <div key={contentKey}>
        <form method="dialog" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b>{labels.edit}</b>
          <button type="submit">{labels.close}</button>
        </form>

        {err ? <div style={{ color: "#b00", marginTop: 10 }}>{err}</div> : null}
        {msg ? <div style={{ color: "#087", marginTop: 10 }}>{msg}</div> : null}

        <form
          style={{ display: "grid", gap: 8, marginTop: 12 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setErr("");
            setBusy(true);
            try {
              const fd = new FormData(e.currentTarget);
              const id = String(fd.get("id") ?? "");
              const payload = {
                status: String(fd.get("status") ?? ""),
                remainingMinutes: String(fd.get("remainingMinutes") ?? ""),
                validFrom: String(fd.get("validFrom") ?? ""),
                validTo: String(fd.get("validTo") ?? ""),
                paid: String(fd.get("paid") ?? "") === "on",
                paidAt: String(fd.get("paidAt") ?? ""),
                paidAmount: String(fd.get("paidAmount") ?? ""),
                paidNote: String(fd.get("paidNote") ?? ""),
                sharedStudentIds: fd.getAll("sharedStudentIds").map((v) => String(v)),
                note: String(fd.get("note") ?? ""),
              };

              const res = await fetch(`/api/admin/packages/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = (await res.json().catch(() => null)) as any;
              if (!res.ok || !data?.ok) {
                setErr(String(data?.message ?? `Request failed (${res.status})`));
                return;
              }

              dialogRef.current?.close();
              preserveRefresh("Saved");
            } finally {
              setBusy(false);
            }
          }}
        >
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
            {labels.sharedStudents}:
            <select
              name="sharedStudentIds"
              multiple
              size={6}
              defaultValue={pkg.sharedStudents.map((s) => s.studentId)}
              style={{ marginLeft: 8, width: "100%" }}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels.note}:
            <input name="note" type="text" defaultValue={pkg.note ?? ""} style={{ marginLeft: 8, width: "100%" }} />
          </label>

          <button type="submit" disabled={busy}>
            {busy ? `${labels.update}...` : labels.update}
          </button>
        </form>

        <hr style={{ margin: "16px 0" }} />

        <form
          style={{ display: "grid", gap: 8 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setErr("");
            setBusy(true);
            try {
              const fd = new FormData(e.currentTarget);
              const id = String(fd.get("id") ?? "");
              const payload = {
                addMinutes: Number(fd.get("addMinutes") ?? 0),
                note: String(fd.get("note") ?? ""),
                paid: String(fd.get("paid") ?? "") === "on",
                paidAt: String(fd.get("paidAt") ?? ""),
                paidAmount: String(fd.get("paidAmount") ?? ""),
                paidNote: String(fd.get("paidNote") ?? ""),
              };

              const res = await fetch(`/api/admin/packages/${encodeURIComponent(id)}/top-up`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = (await res.json().catch(() => null)) as any;
              if (!res.ok || !data?.ok) {
                setErr(String(data?.message ?? `Request failed (${res.status})`));
                return;
              }

              dialogRef.current?.close();
              preserveRefresh("Saved");
            } finally {
              setBusy(false);
            }
          }}
        >
          <b>{labels.topUp}</b>
          <input type="hidden" name="id" value={pkg.id} />
          <label>
            {labels.topUpMinutes}:
            <input name="addMinutes" type="number" min={1} step={1} defaultValue={60} style={{ marginLeft: 8 }} />
          </label>
          <label>
            {labels.topUpNote}:
            <input name="note" type="text" defaultValue="" style={{ marginLeft: 8, width: "100%" }} />
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" name="paid" defaultChecked={false} />
            {labels.paid}
          </label>
          <label>
            {labels.paidAt}:
            <input name="paidAt" type="datetime-local" defaultValue="" style={{ marginLeft: 8 }} />
          </label>
          <label>
            {labels.paidAmount}:
            <input name="paidAmount" type="number" min={0} step={1} defaultValue="" style={{ marginLeft: 8 }} />
          </label>
          <label>
            {labels.paidNote}:
            <input name="paidNote" type="text" defaultValue="" style={{ marginLeft: 8, width: "100%" }} />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? `${labels.topUpSubmit}...` : labels.topUpSubmit}
          </button>
        </form>

        <form
          onSubmit={(e) => {
            if (!window.confirm(labels.deleteConfirm)) e.preventDefault();
          }}
          style={{ marginTop: 12 }}
        >
          <input type="hidden" name="id" value={pkg.id} />
          <button
            type="button"
            disabled={busy}
            style={{ color: "#b00" }}
            onClick={async () => {
              if (busy) return;
              if (!window.confirm(labels.deleteConfirm)) return;
              setErr("");
              setBusy(true);
              try {
                const res = await fetch(`/api/admin/packages/${encodeURIComponent(pkg.id)}`, { method: "DELETE" });
                const data = (await res.json().catch(() => null)) as any;
                if (!res.ok || !data?.ok) {
                  setErr(String(data?.message ?? `Request failed (${res.status})`));
                  return;
                }
                dialogRef.current?.close();
                preserveRefresh("Deleted");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? `${labels.deleteLabel}...` : labels.deleteLabel}
          </button>
        </form>
        </div>
      </dialog>
    </>
  );
}
