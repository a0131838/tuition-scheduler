"use client";

import { useDeferredValue, useMemo, useState } from "react";

type Option = {
  value: string;
  label: string;
  searchText?: string;
};

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
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const filteredOptions = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) return options;
    return options.filter((opt) => {
      if (!opt.value) return true;
      return [opt.label, opt.searchText ?? ""].join(" ").toLowerCase().includes(term);
    });
  }, [options, deferredSearch]);

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
          defaultValue={defaultValue}
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
