"use client";

import { useMemo, useState } from "react";

type Option = {
  id: string;
  label: string;
  description?: string;
  searchText?: string;
};

export default function SearchableMultiSelect({
  name,
  options,
  selectedIds,
  onChange,
  excludeIds = [],
  searchPlaceholder,
  selectedTitle,
  emptyText,
}: {
  name: string;
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  excludeIds?: string[];
  searchPlaceholder: string;
  selectedTitle: string;
  emptyText: string;
}) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const excludedSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  const selectedOptions = useMemo(
    () => selectedIds.map((id) => options.find((option) => option.id === id)).filter(Boolean) as Option[],
    [options, selectedIds]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((option) => {
      if (selectedSet.has(option.id) || excludedSet.has(option.id)) return false;
      if (!q) return true;
      const haystack = [option.label, option.description, option.searchText, option.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [excludedSet, options, query, selectedSet]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <input
        type="text"
        value={query}
        placeholder={searchPlaceholder}
        onChange={(e) => setQuery(e.target.value)}
        style={{ minHeight: 38 }}
      />

      <div
        style={{
          border: "1px solid #dbe4f0",
          borderRadius: 12,
          padding: 10,
          background: "#fff",
          display: "grid",
          gap: 8,
          maxHeight: 220,
          overflow: "auto",
        }}
      >
        {filteredOptions.length > 0 ? (
          filteredOptions.slice(0, 12).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange([...selectedIds, option.id]);
                setQuery("");
              }}
              style={{
                textAlign: "left",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "8px 10px",
                background: "#f8fafc",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 600 }}>{option.label}</div>
              {option.description ? (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{option.description}</div>
              ) : null}
            </button>
          ))
        ) : (
          <div style={{ fontSize: 13, color: "#64748b" }}>{emptyText}</div>
        )}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{selectedTitle}</div>
        {selectedOptions.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {selectedOptions.map((option) => (
              <span
                key={option.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid #bfdbfe",
                  borderRadius: 999,
                  padding: "6px 10px",
                  background: "#eff6ff",
                }}
              >
                <span>{option.label}</span>
                <button
                  type="button"
                  onClick={() => onChange(selectedIds.filter((id) => id !== option.id))}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#1d4ed8",
                    fontWeight: 700,
                  }}
                  aria-label={`Remove ${option.label}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#94a3b8" }}>None selected / 暂未选择</div>
        )}
      </div>

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
    </div>
  );
}
