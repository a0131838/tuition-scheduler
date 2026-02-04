﻿"use client";

import React, { useMemo, useState } from "react";

export type AttendanceRow = {
  studentId: string;
  studentName: string;
  status: string;
  deductedCount: number;
  deductedMinutes: number;
  note: string;
  packageId: string;
  excusedCharge: boolean;
  excusedBaseCount: number;
  packageOptions: Array<{
    id: string;
    label: string;
    remainingMinutes: number | null;
    validToLabel: string | null;
  }>;
};

type Props = {
  rows: AttendanceRow[];
  lang: Lang;
};

function fmtMinutes(min?: number | null) {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

type Lang = "BILINGUAL" | "ZH" | "EN";

function t(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

export default function AttendanceEditor({ rows, lang }: Props) {
  const [state, setState] = useState(() => {
    const init: Record<
      string,
      { deductedMinutes: number; packageId: string; excusedCharge: boolean; status: string }
    > = {};
    for (const r of rows) {
      init[r.studentId] = {
        deductedMinutes: r.deductedMinutes ?? 0,
        packageId: r.packageId ?? "",
        excusedCharge: r.excusedCharge ?? false,
        status: r.status,
      };
    }
    return init;
  });

  const insuffMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of rows) {
      const st = state[r.studentId];
      const pkg = r.packageOptions.find((p) => p.id === st?.packageId);
      if (!pkg) continue;
      if (pkg.remainingMinutes == null) continue;
      if ((st?.deductedMinutes ?? 0) > pkg.remainingMinutes) {
        map[r.studentId] = `余额不足：需 ${fmtMinutes(st.deductedMinutes)} / 仅剩 ${fmtMinutes(pkg.remainingMinutes)}`;
      }
    }
    return map;
  }, [rows, state]);

  const hasInsufficient = Object.keys(insuffMap).length > 0;

  return (
    <>
      {hasInsufficient && (
        <div style={{ padding: 12, border: "1px solid #f2b3b3", background: "#fff5f5", marginBottom: 12 }}>
          <b>{t(lang, "Insufficient balance", "余额不足")}：</b>
          {t(lang, "Please adjust deducted minutes or select another package.", "请调整扣分钟或选择其他课包。")}
        </div>
      )}

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{t(lang, "Student", "学生")}</th>
            <th align="left">{t(lang, "Status", "状态")}</th>
            <th align="left">{t(lang, "Excused Charge", "请假扣费")}</th>
            <th align="left">{t(lang, "Package", "课包")}</th>
            <th align="left">{t(lang, "Remaining", "剩余")}</th>
            <th align="left">{t(lang, "Deduct Count", "扣次数")}</th>
            <th align="left">{t(lang, "Deduct Minutes", "扣分钟")}</th>
            <th align="left">{t(lang, "Note", "备注")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const st = state[r.studentId];
            const pkg = r.packageOptions.find((p) => p.id === st?.packageId);
            const insufficient = insuffMap[r.studentId];
            const status = st?.status ?? r.status;
            const excusedCount = r.excusedBaseCount + (status === "EXCUSED" ? 1 : 0);
            const excusedEligible = excusedCount >= 4;

            return (
              <tr key={r.studentId} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.studentName}</div>
                  <div style={{ color: "#999", fontSize: 12 }}>{r.studentId}</div>
                </td>

                <td>
                  <select
                    name={`status:${r.studentId}`}
                    value={status}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        [r.studentId]: { ...s[r.studentId], status: e.target.value },
                      }))
                    }
                    style={{ minWidth: 160 }}
                  >
                    <option value="UNMARKED">{t(lang, "UNMARKED", "未点名")}</option>
                    <option value="PRESENT">{t(lang, "PRESENT", "到")}</option>
                    <option value="ABSENT">{t(lang, "ABSENT", "缺")}</option>
                    <option value="LATE">{t(lang, "LATE", "迟到")}</option>
                    <option value="EXCUSED">{t(lang, "EXCUSED", "请假")}</option>
                  </select>
                </td>

                <td>
                  {status === "EXCUSED" ? (
                    excusedEligible ? (
                      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="checkbox"
                          name={`charge:${r.studentId}`}
                          checked={st?.excusedCharge ?? false}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              [r.studentId]: { ...s[r.studentId], excusedCharge: e.target.checked },
                            }))
                          }
                        />
                        {t(lang, "Charge", "扣费")}
                      </label>
                    ) : (
                      <span style={{ color: "#666" }}>{t(lang, "No charge", "免扣")}(第{excusedCount}次)</span>
                    )
                  ) : (
                    <span style={{ color: "#999" }}>-</span>
                  )}
                  <div style={{ color: "#999", fontSize: 12 }}>
                    {t(lang, "Excused total", "累计请假")} {excusedCount} {t(lang, "times", "次")}
                  </div>
                </td>

                <td>
                  <select
                    name={`pkg:${r.studentId}`}
                    value={st?.packageId ?? ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        [r.studentId]: { ...s[r.studentId], packageId: e.target.value },
                      }))
                    }
                    style={{ minWidth: 220 }}
                  >
                    <option value="">{t(lang, "(none)", "(无)")}</option>
                    {r.packageOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {pkg?.validToLabel && (
                    <div style={{ color: "#999", fontSize: 12 }}>
                      {t(lang, "Valid until", "有效期至")} {pkg.validToLabel}
                    </div>
                  )}
                </td>

                <td>
                  <div style={{ fontWeight: insufficient ? 700 : 400, color: insufficient ? "#b00" : undefined }}>
                    {fmtMinutes(pkg?.remainingMinutes ?? null)}
                  </div>
                  {insufficient && <div style={{ color: "#b00", fontSize: 12 }}>{insufficient}</div>}
                </td>

                <td>
                  <input name={`dc:${r.studentId}`} type="number" min={0} step={1} defaultValue={r.deductedCount} style={{ width: 120 }} />
                </td>

                <td>
                  <input
                    name={`dm:${r.studentId}`}
                    type="number"
                    min={0}
                    step={15}
                    value={st?.deductedMinutes ?? 0}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        [r.studentId]: { ...s[r.studentId], deductedMinutes: Number(e.target.value || 0) },
                      }))
                    }
                    style={{ width: 140 }}
                  />
                </td>

                <td>
                  <input
                    name={`note:${r.studentId}`}
                    type="text"
                    defaultValue={r.note}
                    placeholder={t(lang, "optional...", "可选...")}
                    style={{ width: "100%", minWidth: 220 }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" disabled={hasInsufficient}>{t(lang, "Save Attendance", "保存点名")}</button>
        <span style={{ color: "#666" }}>
          {t(lang, "Saving will deduct minutes and record ledger. Insufficient balance blocks saving.", "保存时将扣减课包余额并记录流水。余额不足将无法保存。")}
        </span>
      </div>
    </>
  );
}
