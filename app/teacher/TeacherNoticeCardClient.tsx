"use client";

import { useState, useTransition } from "react";
import type { TeacherNotice } from "@/lib/teacher-notices";

export default function TeacherNoticeCardClient({
  notice,
  title,
  body,
  publishedLabel,
  markReadLabel,
  readLabel,
  errorLabel,
}: {
  notice: TeacherNotice;
  title: string;
  body: string;
  publishedLabel: string;
  markReadLabel: string;
  readLabel: string;
  errorLabel: string;
}) {
  const [isRead, setIsRead] = useState(false);
  const [err, setErr] = useState("");
  const [pending, startTransition] = useTransition();

  if (isRead) return null;

  return (
    <section
      style={{
        border: notice.important ? "1px solid #f59e0b" : "1px solid #bfdbfe",
        borderRadius: 14,
        padding: 14,
        background: notice.important ? "#fffbeb" : "#eff6ff",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800, color: notice.important ? "#92400e" : "#1d4ed8" }}>{title}</div>
          <div style={{ color: "#334155", lineHeight: 1.45, maxWidth: 1120 }}>{body}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {publishedLabel}: {notice.publishedAt}
          </div>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setErr("");
            startTransition(async () => {
              try {
                const res = await fetch("/api/teacher/notices/read", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ noticeId: notice.id }),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? `HTTP ${res.status}`));
                setIsRead(true);
              } catch (error) {
                setErr(error instanceof Error ? error.message : "Failed");
              }
            });
          }}
          style={{ whiteSpace: "nowrap" }}
        >
          {pending ? `${markReadLabel}...` : markReadLabel}
        </button>
      </div>
      {err ? <div style={{ color: "#b91c1c", fontSize: 13 }}>{errorLabel}: {err}</div> : null}
      {isRead ? <div style={{ color: "#166534", fontSize: 13 }}>{readLabel}</div> : null}
    </section>
  );
}
