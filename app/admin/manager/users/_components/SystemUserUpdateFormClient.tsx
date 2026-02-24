"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type TeacherOption = { id: string; name: string };

function preserveRefresh(router: ReturnType<typeof useRouter>) {
  const y = window.scrollY;
  router.refresh();
  requestAnimationFrame(() => window.scrollTo(0, y));
}

export default function SystemUserUpdateFormClient({
  user,
  teachers,
  labels,
}: {
  user: { id: string; name: string; email: string; role: string; language: string; teacherId: string | null };
  teachers: TeacherOption[];
  labels: { name: string; role: string; language: string; noTeacher: string; save: string; errorPrefix: string };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div style={{ display: "grid", gap: 6, minWidth: 250 }}>
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
            };
            const res = await fetch(`/api/admin/manager/users/${encodeURIComponent(user.id)}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
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
        style={{ display: "grid", gap: 6 }}
      >
        <input name="name" defaultValue={user.name} placeholder={labels.name} disabled={busy} />
        <input name="email" type="email" defaultValue={user.email} placeholder="Email" disabled={busy} />
        <div style={{ display: "flex", gap: 6 }}>
          <select name="role" defaultValue={user.role} disabled={busy}>
            <option value="ADMIN">ADMIN</option>
            <option value="FINANCE">FINANCE</option>
            <option value="TEACHER">TEACHER</option>
            <option value="STUDENT">STUDENT</option>
          </select>
          <select name="language" defaultValue={user.language} disabled={busy}>
            <option value="BILINGUAL">BILINGUAL</option>
            <option value="ZH">ZH</option>
            <option value="EN">EN</option>
          </select>
        </div>
        <select name="teacherId" defaultValue={user.teacherId ?? ""} disabled={busy}>
          <option value="">{labels.noTeacher}</option>
          {teachers.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={busy}>
          {busy ? `${labels.save}...` : labels.save}
        </button>
      </form>
    </div>
  );
}
