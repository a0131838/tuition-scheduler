"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type TeacherOption = { id: string; name: string };

function preserveRefresh(router: ReturnType<typeof useRouter>) {
  const y = window.scrollY;
  router.refresh();
  requestAnimationFrame(() => window.scrollTo(0, y));
}

export default function SystemUserCreateClient({
  teachers,
  labels,
}: {
  teachers: TeacherOption[];
  labels: {
    name: string;
    role: string;
    language: string;
    bindTeacherOptional: string;
    noBinding: string;
    initialPassword: string;
    create: string;
    errorPrefix: string;
  };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div style={{ display: "grid", gap: 6 }}>
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
            const payload = {
              email: String(fd.get("email") ?? ""),
              name: String(fd.get("name") ?? ""),
              role: String(fd.get("role") ?? ""),
              language: String(fd.get("language") ?? ""),
              teacherId: String(fd.get("teacherId") ?? ""),
              password: String(fd.get("password") ?? ""),
            };

            const res = await fetch("/api/admin/manager/users", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
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
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}
      >
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12 }}>Email</span>
          <input name="email" type="email" required style={{ minWidth: 240 }} disabled={busy} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12 }}>{labels.name}</span>
          <input name="name" required style={{ minWidth: 160 }} disabled={busy} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12 }}>{labels.role}</span>
          <select name="role" defaultValue="ADMIN" disabled={busy}>
            <option value="ADMIN">ADMIN</option>
            <option value="TEACHER">TEACHER</option>
            <option value="STUDENT">STUDENT</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12 }}>{labels.language}</span>
          <select name="language" defaultValue="BILINGUAL" disabled={busy}>
            <option value="BILINGUAL">BILINGUAL</option>
            <option value="ZH">ZH</option>
            <option value="EN">EN</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12 }}>{labels.bindTeacherOptional}</span>
          <select name="teacherId" defaultValue="" disabled={busy}>
            <option value="">{labels.noBinding}</option>
            {teachers.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12 }}>{labels.initialPassword}</span>
          <input name="password" type="password" required minLength={8} style={{ minWidth: 180 }} disabled={busy} />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? `${labels.create}...` : labels.create}
        </button>
      </form>
    </div>
  );
}

