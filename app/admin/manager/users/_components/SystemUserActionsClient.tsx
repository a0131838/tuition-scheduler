"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

function preserveRefresh(router: ReturnType<typeof useRouter>) {
  const y = window.scrollY;
  router.refresh();
  requestAnimationFrame(() => window.scrollTo(0, y));
}

export default function SystemUserActionsClient({
  userId,
  labels,
}: {
  userId: string;
  labels: {
    newPasswordPlaceholder: string;
    resetPassword: string;
    deleteUser: string;
    confirmDelete: string;
    errorPrefix: string;
  };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {err ? (
        <div style={{ color: "#b00", fontSize: 12 }}>
          {labels.errorPrefix}: {err}
        </div>
      ) : null}

      <form
        ref={formRef}
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setErr("");
          setBusy(true);
          try {
            const fd = new FormData(formRef.current ?? undefined);
            const password = String(fd.get("password") ?? "");
            const res = await fetch(`/api/admin/manager/users/${encodeURIComponent(userId)}/reset-password`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ password }),
            });
            const data = (await res.json().catch(() => null)) as any;
            if (!res.ok || !data?.ok) {
              setErr(String(data?.message ?? `Request failed (${res.status})`));
              return;
            }
            (formRef.current as any)?.reset?.();
            preserveRefresh(router);
          } finally {
            setBusy(false);
          }
        }}
        style={{ display: "grid", gap: 6 }}
      >
        <input name="password" type="password" minLength={8} placeholder={labels.newPasswordPlaceholder} disabled={busy} />
        <button type="submit" disabled={busy}>
          {busy ? `${labels.resetPassword}...` : labels.resetPassword}
        </button>
      </form>

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setErr("");
          if (!confirm(labels.confirmDelete)) return;
          setBusy(true);
          try {
            const res = await fetch(`/api/admin/manager/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
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
        {busy ? `${labels.deleteUser}...` : labels.deleteUser}
      </button>
    </div>
  );
}

