"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

type Option = {
  value: string;
  label: string;
  searchText?: string;
};

const RECENT_STORAGE_KEY = "financeInvoiceRecentPackages";
const MAX_RECENT = 5;

export default function PackageSelectAutoSubmit({
  name,
  defaultValue,
  options,
  lang,
}: {
  name: string;
  defaultValue: string;
  options: Option[];
  lang: "BILINGUAL" | "ZH" | "EN";
}) {
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [search, setSearch] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    setSelectedValue(defaultValue);
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
      const current = raw ? (JSON.parse(raw) as string[]) : [];
      if (defaultValue) {
        const next = [defaultValue, ...current.filter((id) => id !== defaultValue)].slice(0, MAX_RECENT);
        window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
        setRecentIds(next);
        return;
      }
      setRecentIds(current);
    } catch {
      setRecentIds([]);
    }
  }, [defaultValue]);

  const filteredOptions = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) return options;
    return options.filter((opt) => {
      if (!opt.value) return true;
      return [opt.label, opt.searchText ?? ""].join(" ").toLowerCase().includes(term);
    });
  }, [options, deferredSearch]);

  const optionMap = useMemo(
    () => new Map(options.filter((opt) => opt.value).map((opt) => [opt.value, opt])),
    [options]
  );
  const recentOptions = useMemo(
    () => recentIds.map((id) => optionMap.get(id)).filter(Boolean) as Option[],
    [recentIds, optionMap]
  );

  const rememberSelected = (value: string) => {
    const clean = String(value || "").trim();
    if (!clean || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
      const current = raw ? (JSON.parse(raw) as string[]) : [];
      const next = [clean, ...current.filter((id) => id !== clean)].slice(0, MAX_RECENT);
      window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      setRecentIds(next);
    } catch {
      // ignore storage failures
    }
  };

  return (
    <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
      <input
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        placeholder={
          lang === "ZH"
            ? "搜索学生 / 课程 / 课包ID"
            : lang === "EN"
              ? "Search student / course / package id"
              : "Search student / course / package id / 搜索学生 / 课程 / 课包ID"
        }
        style={{ minWidth: 340, maxWidth: 520, width: "100%" }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          name={name}
          value={selectedValue}
          onChange={(e) => {
            setSelectedValue(e.currentTarget.value);
            rememberSelected(e.currentTarget.value);
          }}
          style={{ minWidth: 340, maxWidth: 520, width: "100%" }}
        >
          {filteredOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSearch("")}
        >
          {lang === "ZH" ? "清除" : lang === "EN" ? "Clear" : "Clear / 清除"}
        </button>
      </div>
      {recentOptions.length > 0 ? (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>
            {lang === "ZH"
              ? "最近使用课包"
              : lang === "EN"
                ? "Recent packages"
                : "Recent packages / 最近使用课包"}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {recentOptions.map((opt) => (
              <button
                key={`recent-${opt.value}`}
                type="button"
                onClick={() => {
                  setSelectedValue(opt.value);
                  rememberSelected(opt.value);
                }}
                style={{
                  border: "1px solid #bfdbfe",
                  background: selectedValue === opt.value ? "#dbeafe" : "#fff",
                  color: "#1d4ed8",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 12,
                  maxWidth: 320,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={opt.label}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div style={{ fontSize: 12, color: "#64748b" }}>
        {search.trim()
          ? (lang === "ZH"
              ? `匹配项：${filteredOptions.filter((opt) => opt.value).length}`
              : lang === "EN"
                ? `${filteredOptions.filter((opt) => opt.value).length} match(es)`
                : `${filteredOptions.filter((opt) => opt.value).length} match(es) / 匹配项`)
          : (lang === "ZH"
              ? "先在这里本地搜索，再点击下面的加载课包摘要。"
              : lang === "EN"
                ? "Search locally first, then load the package summary below."
                : "Search locally first, then load the package summary below. / 先在这里本地搜索，再点击下面的加载课包摘要。")}
      </div>
    </div>
  );
}
