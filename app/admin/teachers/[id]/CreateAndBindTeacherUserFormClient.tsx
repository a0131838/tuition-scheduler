"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CopyTeacherCredentialsButton from "../../_components/CopyTeacherCredentialsButton";

export default function CreateAndBindTeacherUserFormClient({
  teacherId,
  defaultName,
  labels,
}: {
  teacherId: string;
  defaultName: string;
  labels: {
    loginEmail: string;
    teacherName: string;
    initialPassword: string;
    quickCopy: string;
    copy3: string;
    submit: string;
    errorPrefix: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <form
      style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "end" }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setErr("");
        setBusy(true);
        try {
          const fd = new FormData(e.currentTarget);
          const payload = {
            email: String(fd.get("email") ?? ""),
            name: String(fd.get("name") ?? ""),
            password: String(fd.get("password") ?? ""),
          };
          const res = await fetch(`/api/admin/teachers/${encodeURIComponent(teacherId)}/user/create-and-bind`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = (await res.json().catch(() => null)) as any;
          if (!res.ok || !data?.ok) {
            setErr(String(data?.message ?? `Request failed (${res.status})`));
            return;
          }
          const y = window.scrollY;
          router.refresh();
          requestAnimationFrame(() => window.scrollTo(0, y));
        } finally {
          setBusy(false);
        }
      }}
    >
      {err ? (
        <div style={{ color: "#b00", fontSize: 12, flexBasis: "100%" }}>
          {labels.errorPrefix}: {err}
        </div>
      ) : null}

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#666" }}>{labels.loginEmail}</span>
        <input id="teacher-account-email" name="email" type="email" style={{ minWidth: 260 }} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#666" }}>{labels.teacherName}</span>
        <input id="teacher-account-name" name="name" defaultValue={defaultName} style={{ minWidth: 180 }} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#666" }}>{labels.initialPassword}</span>
        <input id="teacher-account-password" name="password" type="password" style={{ minWidth: 220 }} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#666" }}>{labels.quickCopy}</span>
        <CopyTeacherCredentialsButton
          emailInputId="teacher-account-email"
          nameInputId="teacher-account-name"
          passwordInputId="teacher-account-password"
          label={labels.copy3}
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? `${labels.submit}...` : labels.submit}
      </button>
    </form>
  );
}

