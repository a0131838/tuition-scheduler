"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";

export default function AdminSetupClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {err ? <NoticeBanner type="error" title="Error" message={err} /> : null}
      <label>
        Email:
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          style={{ marginLeft: 6, width: "100%" }}
          disabled={busy}
        />
      </label>
      <label>
        Name:
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          type="text"
          required
          style={{ marginLeft: 6, width: "100%" }}
          disabled={busy}
        />
      </label>
      <label>
        Password:
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          style={{ marginLeft: 6, width: "100%" }}
          disabled={busy}
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setErr("");
          setBusy(true);
          try {
            const res = await fetch("/api/admin/setup", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email, name, password }),
            });
            const data = (await res.json().catch(() => null)) as any;
            if (!res.ok || !data?.ok) {
              setErr(String(data?.message ?? `Request failed (${res.status})`));
              return;
            }
            router.push(String(data?.redirectTo ?? "/admin"));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Create Admin..." : "Create Admin"}
      </button>
    </div>
  );
}

