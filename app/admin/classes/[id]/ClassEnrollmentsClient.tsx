"use client";

import { useMemo, useState } from "react";
import NoticeBanner from "../../_components/NoticeBanner";

type StudentOption = { id: string; name: string };
type EnrollmentRow = { id: string; studentId: string; studentName: string };

export default function ClassEnrollmentsClient({
  classId,
  initialAvailableStudents,
  initialEnrollments,
  labels,
}: {
  classId: string;
  initialAvailableStudents: StudentOption[];
  initialEnrollments: EnrollmentRow[];
  labels: {
    enrollments: string;
    selectStudent: string;
    add: string;
    remove: string;
    noEnrollments: string;
    ok: string;
    error: string;
  };
}) {
  const [availableStudents, setAvailableStudents] = useState<StudentOption[]>(initialAvailableStudents);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>(initialEnrollments);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const studentMap = useMemo(() => new Map(availableStudents.map((s) => [s.id, s.name])), [availableStudents]);

  async function add() {
    setErr("");
    setMsg("");
    const studentId = selectedStudentId;
    if (!studentId) return;

    const res = await fetch("/api/admin/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, studentId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Add enrollment failed"));
      return;
    }

    const name = studentMap.get(studentId) ?? availableStudents.find((s) => s.id === studentId)?.name ?? studentId;
    setEnrollments((prev) => [{ id: data.enrollment.id, studentId, studentName: name }, ...prev]);
    setAvailableStudents((prev) => prev.filter((s) => s.id !== studentId));
    setSelectedStudentId("");
    setMsg("OK");
  }

  async function remove(studentId: string) {
    setErr("");
    setMsg("");
    const row = enrollments.find((e) => e.studentId === studentId) ?? null;

    const res = await fetch("/api/admin/enrollments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, studentId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Remove enrollment failed"));
      return;
    }

    setEnrollments((prev) => prev.filter((e) => e.studentId !== studentId));
    if (row) {
      setAvailableStudents((prev) => [...prev, { id: row.studentId, name: row.studentName }].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setMsg("OK");
  }

  return (
    <div>
      <h3>{labels.enrollments}</h3>
      {err ? <NoticeBanner type="error" title={labels.error} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={labels.ok} message={msg} /> : null}

      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, background: "#fafafa", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
            <option value="">{labels.selectStudent}</option>
            {availableStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={add} disabled={!selectedStudentId}>
            {labels.add}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {enrollments.length === 0 ? (
          <div style={{ color: "#999" }}>{labels.noEnrollments}</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {enrollments.map((e) => (
              <div key={e.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, background: "#fff" }}>
                <div style={{ fontWeight: 700 }}>{e.studentName}</div>
                <div style={{ marginTop: 6 }}>
                  <button type="button" onClick={() => remove(e.studentId)}>
                    {labels.remove}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

