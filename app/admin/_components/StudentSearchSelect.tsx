"use client";

import { useMemo, useState } from "react";

export default function StudentSearchSelect({
  students,
  name,
  placeholder,
}: {
  students: { id: string; name: string }[];
  name: string;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(students[0]?.id ?? "");

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
        onChange={(e) => setSelectedId(e.target.value)}
        style={{ minWidth: 320 }}
      >
        {filtered.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.id.slice(0, 8)}...)
          </option>
        ))}
      </select>
      <input type="hidden" name={name} value={selectedId} />
    </div>
  );
}
