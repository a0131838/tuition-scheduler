"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [selectedId, setSelectedId] = useState("");
  const [userConfirmed, setUserConfirmed] = useState(false);
  const selectedStudent = students.find((s) => s.id === selectedId) ?? null;
  useEffect(() => {
    if (students.length === 0) {
      setSelectedId("");
      setUserConfirmed(false);
      return;
    }
    if (!students.some((s) => s.id === selectedId)) {
      setSelectedId("");
      setUserConfirmed(false);
    }
  }, [students, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [query, students]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    if (filtered.length === 1) {
      const onlyId = filtered[0].id;
      if (selectedId !== onlyId) setSelectedId(onlyId);
      if (!userConfirmed) setUserConfirmed(true);
      return;
    }
    if (userConfirmed) setUserConfirmed(false);
    if (selectedId && !filtered.some((s) => s.id === selectedId)) {
      setSelectedId("");
    }
  }, [query, filtered, selectedId, userConfirmed]);

  const effectiveSelectedId = useMemo(() => {
    if (query.trim() && filtered.length === 1) return filtered[0].id;
    if (userConfirmed && selectedId && filtered.some((s) => s.id === selectedId)) return selectedId;
    return "";
  }, [query, filtered, userConfirmed, selectedId]);

  const effectiveSelectedStudent = students.find((s) => s.id === effectiveSelectedId) ?? selectedStudent;

  useEffect(() => {
    onChangeId?.(effectiveSelectedId);
  }, [effectiveSelectedId, onChangeId]);

  const needManualPick = query.trim().length > 0 && filtered.length > 1 && !userConfirmed;

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setUserConfirmed(false);
        }}
      />
      <select
        value={selectedId}
        onChange={(e) => {
          const next = e.target.value;
          setSelectedId(next);
          setUserConfirmed(Boolean(next));
        }}
        style={{ minWidth: 320 }}
      >
        <option value="">-- Select / 请选择 --</option>
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
      {effectiveSelectedStudent ? (
        <div style={{ fontSize: 12, color: "#334155" }}>
          Selected / 已选择: {effectiveSelectedStudent.name} (STU-{effectiveSelectedStudent.id.slice(0, 4)}…{effectiveSelectedStudent.id.slice(-4)})
        </div>
      ) : null}
      {needManualPick ? (
        <div style={{ fontSize: 12, color: "#b00" }}>Multiple matches found. Please select one student explicitly. / 匹配到多名学生，请明确选择。</div>
      ) : null}
      {showEmptyWarning && emptyCourseLabel && (!effectiveSelectedStudent?.courseIds || effectiveSelectedStudent.courseIds.length === 0) ? (
        <div style={{ fontSize: 12, color: "#b00" }}>{emptyCourseLabel}</div>
      ) : null}
      <input type="hidden" name={name} value={effectiveSelectedId} />
    </div>
  );
}
