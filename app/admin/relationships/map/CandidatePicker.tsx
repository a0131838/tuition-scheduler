"use client";
import { useEffect, useRef, useState } from "react";
import { searchCandidatesAction } from "./actions";
import {
  networkText as tr,
  type NetworkCandidate,
} from "@/lib/sales-network-types";
import css from "./NetworkWorkspace.module.css";
export default function CandidatePicker({
  lang,
  type,
  onSelect,
  initialQuery = "",
}: {
  lang: string;
  type: NetworkCandidate["type"];
  onSelect: (c: NetworkCandidate) => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery),
    [rows, setRows] = useState<NetworkCandidate[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [searched, setSearched] = useState(false),
    [selected, setSelected] = useState("");
  const seq = useRef(0);
  const t = (en: string, zh: string) => tr(lang, en, zh);
  useEffect(() => {
    if (initialQuery.trim().length < 2) return;
    const current = ++seq.current;
    setBusy(true);
    searchCandidatesAction(initialQuery)
      .then((result) => {
        if (current === seq.current) {
          setRows(result.filter((r) => r.type === type));
          setSearched(true);
        }
      })
      .catch(() => {
        if (current === seq.current)
          setError(
            t(
              "Search failed; try a name or phone fragment",
              "搜索失败，可输入姓名或电话片段重试",
            ),
          );
      })
      .finally(() => {
        if (current === seq.current) setBusy(false);
      });
    return () => {
      seq.current++;
    };
  }, [initialQuery, type]);
  return (
    <div className={css.candidatePanel}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          aria-label={t("Search existing records", "搜索已有档案")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            seq.current++;
            setRows([]);
            setSearched(false);
            setBusy(false);
            setSelected("");
          }}
          placeholder={t("Name (at least 2 characters)", "姓名（至少2个字符）")}
        />
        <button
          type="button"
          disabled={busy || query.trim().length < 2}
          style={{ width: "auto", margin: 0, whiteSpace: "nowrap" }}
          onClick={async () => {
            const current = ++seq.current;
            setBusy(true);
            setError("");
            try {
              const result = await searchCandidatesAction(query);
              if (current === seq.current) {
                setRows(result.filter((r) => r.type === type));
                setSearched(true);
              }
            } catch {
              if (current === seq.current)
                setError(t("Search failed. Try again.", "搜索失败，请重试。"));
            } finally {
              if (current === seq.current) setBusy(false);
            }
          }}
        >
          {busy ? "…" : t("Search", "搜索")}
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {searched && !rows.length ? (
        <p>
          {t(
            "No matches. Try another name or alias.",
            "暂无匹配，可尝试其他姓名或别名。",
          )}
        </p>
      ) : null}
      {rows.map((c) => (
        <button
          type="button"
          key={c.id}
          className={selected === c.id ? css.chosen : ""}
          onClick={() => {
            setSelected(c.id);
            onSelect(c);
          }}
        >
          <strong>{c.name}</strong>
          <small>
            {c.detail}
            <br />
            ID: {c.id}
          </small>
        </button>
      ))}
      <small>
        {t(
          "Select an exact record after checking the identity. Names do not auto-link. Up to 8 matches per type.",
          "核对身份后选择准确档案；不会按姓名自动关联，每类最多显示8条。",
        )}
      </small>
    </div>
  );
}
