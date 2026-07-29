"use client";

import { useState } from "react";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";

export default function AdminLoginClient({ next }: { next: string }) {
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
      window.location.assign(String(data?.redirectTo ?? "/admin"));
    } finally {
      setBusy("");
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit("admin");
      }}
      style={{ display: "grid", gap: 12 }}
    >
      {err ? <NoticeBanner type="error" title="Error" message={err} /> : null}
      <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
        <span>Email</span>
        <input
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="username"
          required
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }}
          disabled={Boolean(busy)}
        />
      </label>
      <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
        <span>Password</span>
        <input
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          required
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }}
          disabled={Boolean(busy)}
        />
      </label>
      <button
        type="submit"
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
        onClick={() => void submit("teacher")}
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
    </form>
  );
}
