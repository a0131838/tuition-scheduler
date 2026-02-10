"use client";

import { useState } from "react";

export default function EnrollmentRemoveButton(props: {
  classId: string;
  studentId: string;
  labels: {
    remove: string;
    undo: string;
  };
}) {
  const { classId, studentId, labels } = props;
  const [loading, setLoading] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/enrollments", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classId, studentId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(String(data?.message ?? "Remove failed"));
        return;
      }
      setRemoved(true);
    } catch (e: any) {
      setError(String(e?.message ?? "Remove failed"));
    } finally {
      setLoading(false);
    }
  };

  const undo = async () => {
    if (loading) return;
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
      setRemoved(false);
    } catch (e: any) {
      setError(String(e?.message ?? "Undo failed"));
    } finally {
      setLoading(false);
    }
  };

  if (removed) {
    return (
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: "#999", fontSize: 12 }}>Removed</span>
        <button type="button" onClick={undo} disabled={loading}>
          {loading ? "..." : labels.undo}
        </button>
        {error ? <span style={{ color: "#b00", fontSize: 12 }}>{error}</span> : null}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button type="button" onClick={remove} disabled={loading}>
        {loading ? "..." : labels.remove}
      </button>
      {error ? <span style={{ color: "#b00", fontSize: 12 }}>{error}</span> : null}
    </span>
  );
}

