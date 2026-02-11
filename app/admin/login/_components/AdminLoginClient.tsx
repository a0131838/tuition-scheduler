"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";

export default function AdminLoginClient({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"" | "admin" | "teacher">("");
  const [err, setErr] = useState("");

  async function submit(portal: "admin" | "teacher") {
    if (busy) return;
    setErr("");
    setBusy(portal);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, next, portal }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) {
        setErr(String(data?.message ?? `Request failed (${res.status})`));
        return;
      }
      router.push(String(data?.redirectTo ?? "/admin"));
    } finally {
      setBusy("");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {err ? <NoticeBanner type="error" title="Error" message={err} /> : null}
      <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
        <span>Email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }}
          disabled={Boolean(busy)}
        />
      </label>
      <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
        <span>Password</span>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }}
          disabled={Boolean(busy)}
        />
      </label>
      <button
        type="button"
        onClick={() => submit("admin")}
        disabled={Boolean(busy)}
        style={{
          marginTop: 4,
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #cbd5f5",
          background: "#eef2ff",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {busy === "admin" ? "进入管理端 / Admin..." : "进入管理端 / Admin"}
      </button>
      <button
        type="button"
        onClick={() => submit("teacher")}
        disabled={Boolean(busy)}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: "#f8fafc",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {busy === "teacher" ? "进入老师端 / Teacher..." : "进入老师端 / Teacher"}
      </button>
    </div>
  );
}
