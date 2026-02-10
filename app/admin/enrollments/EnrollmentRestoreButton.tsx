"use client";

import { useState } from "react";

export default function EnrollmentRestoreButton(props: {
  classId: string;
  studentId: string;
  label: string;
}) {
  const { classId, studentId, label } = props;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button
        type="button"
        disabled={loading || done}
        onClick={async () => {
          if (loading || done) return;
          setLoading(true);
          setError("");
          try {
            const res = await fetch("/api/admin/enrollments/restore", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ classId, studentId }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
              setError(String(data?.message ?? "Undo failed"));
              return;
            }
            setDone(true);
          } catch (e: any) {
            setError(String(e?.message ?? "Undo failed"));
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "..." : done ? "OK" : label}
      </button>
      {error ? <span style={{ color: "#b00", fontSize: 12 }}>{error}</span> : null}
    </span>
  );
}

