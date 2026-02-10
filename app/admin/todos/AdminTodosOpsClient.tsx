"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NoticeBanner from "../_components/NoticeBanner";

export default function AdminTodosOpsClient({
  payload,
  labels,
}: {
  payload: { warnDays: string; warnMinutes: string; pastDays: string; showConfirmed: string };
  labels: {
    ok: string;
    error: string;
    recheckNow: string;
    runNow: string;
  };
}) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, startPending] = useTransition();

  async function run(action: "rerun" | "autofix") {
    setErr("");
    setMsg("");
    const y = window.scrollY;

    startPending(() => {
      (async () => {
        const res = await fetch("/api/admin/todos/conflict-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setErr(String(data?.message ?? "Failed"));
          return;
        }
        setMsg("OK");
        router.refresh();
        // Restore scroll position in case refresh causes any jump.
        setTimeout(() => {
          try {
            window.scrollTo({ top: y, behavior: "instant" as any });
          } catch {
            window.scrollTo(0, y);
          }
        }, 0);
      })();
    });
  }

  return (
    <div>
      {err ? <NoticeBanner type="error" title={labels.error} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={labels.ok} message={msg} /> : null}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => run("rerun")} disabled={pending}>
          {pending ? "..." : labels.recheckNow}
        </button>
        <button type="button" onClick={() => run("autofix")} disabled={pending}>
          {pending ? "..." : labels.runNow}
        </button>
      </div>
    </div>
  );
}

