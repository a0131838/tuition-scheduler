"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Workspace = "SALES" | "CS" | "CARE" | "HR";

function preserveRefresh(router: ReturnType<typeof useRouter>) {
  const y = window.scrollY;
  router.refresh();
  requestAnimationFrame(() => window.scrollTo(0, y));
}

export default function UserWorkspaceAccessFormClient({
  userId,
  current,
  labels,
}: {
  userId: string;
  current: Workspace[];
  labels: {
    sales: string;
    cs: string;
    care: string;
    hr: string;
    save: string;
    errorPrefix: string;
  };
}) {
  const router = useRouter();
  const [sales, setSales] = useState(current.includes("SALES"));
  const [cs, setCs] = useState(current.includes("CS"));
  const [care, setCare] = useState(current.includes("CARE"));
  const [hr, setHr] = useState(current.includes("HR"));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div style={{ display: "grid", gap: 6, minWidth: 150 }}>
      {err ? <div style={{ color: "#b00", fontSize: 12 }}>{labels.errorPrefix}: {err}</div> : null}
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 700 }}>
        <input type="checkbox" checked={sales} disabled={busy} onChange={(e) => setSales(e.target.checked)} />
        {labels.sales}
      </label>
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 700 }}>
        <input type="checkbox" checked={cs} disabled={busy} onChange={(e) => setCs(e.target.checked)} />
        {labels.cs}
      </label>
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 700 }}>
        <input type="checkbox" checked={care} disabled={busy} onChange={(e) => setCare(e.target.checked)} />
        {labels.care}
      </label>
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 700 }}>
        <input type="checkbox" checked={hr} disabled={busy} onChange={(e) => setHr(e.target.checked)} />
        {labels.hr}
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setErr("");
          setBusy(true);
          try {
            const workspaces: Workspace[] = [];
            if (sales) workspaces.push("SALES");
            if (cs) workspaces.push("CS");
            if (care) workspaces.push("CARE");
            if (hr) workspaces.push("HR");
            const res = await fetch(`/api/admin/manager/users/${encodeURIComponent(userId)}/workspaces`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ workspaces }),
            });
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
        {busy ? `${labels.save}...` : labels.save}
      </button>
    </div>
  );
}
