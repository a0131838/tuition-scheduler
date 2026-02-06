"use client";

import { useMemo, useState } from "react";

export default function StudentSearchSelect({
  students,
  name,
  placeholder,
  emptyCourseLabel,
  showEmptyWarning,
  onChangeId,
}: {
  students: { id: string; name: string; courseNames?: string[]; courseIds?: string[] }[];
  name: string;
  placeholder: string;
  emptyCourseLabel?: string;
  showEmptyWarning?: boolean;
  onChangeId?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(students[0]?.id ?? "");
  const selectedStudent = students.find((s) => s.id === selectedId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [query, students]);

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        value={selectedId}
        onChange={(e) => {
          const next = e.target.value;
          setSelectedId(next);
          onChangeId?.(next);
        }}
        style={{ minWidth: 320 }}
      >
        {filtered.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} (STU-{s.id.slice(0, 4)}…{s.id.slice(-4)}
            {s.courseNames && s.courseNames.length
              ? ` | ${s.courseNames.slice(0, 3).join(", ")}${s.courseNames.length > 3 ? ` +${s.courseNames.length - 3}` : ""}`
              : emptyCourseLabel
              ? ` | 【${emptyCourseLabel}】`
              : ""}
            )
          </option>
        ))}
      </select>
      {showEmptyWarning && emptyCourseLabel && (!selectedStudent?.courseIds || selectedStudent.courseIds.length === 0) ? (
        <div style={{ fontSize: 12, color: "#b00" }}>{emptyCourseLabel}</div>
      ) : null}
      <input type="hidden" name={name} value={selectedId} />
    </div>
  );
}
