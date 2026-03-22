"use client";

import React, { useMemo, useState } from "react";
import NoticeBanner from "../../../_components/NoticeBanner";

export type AttendanceRow = {
  studentId: string;
  studentName: string;
  status: string;
  deductedCount: number;
  deductedMinutes: number;
  suggestedDeductMinutes: number;
  note: string;
  packageId: string;
  excusedCharge: boolean;
  waiveDeduction?: boolean;
  waiveReason?: string;
  excusedBaseCount: number;
  packageOptions: Array<{
    id: string;
    label: string;
    remainingMinutes: number | null;
    billingMode: "MINUTES" | "COUNT" | "NONE";
    validToLabel: string | null;
  }>;
};

type Props = {
  rows: AttendanceRow[];
  lang: Lang;
};

type Lang = "BILINGUAL" | "ZH" | "EN";

function t(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

function fmtMinutes(min?: number | null) {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function isDeductableStatus(status: string, excusedCharge: boolean) {
  return status === "PRESENT" || status === "LATE" || status === "ABSENT" || (status === "EXCUSED" && excusedCharge);
}

export default function AttendanceEditor({ rows, lang }: Props) {
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);
  const [showAllPackagesByStudent, setShowAllPackagesByStudent] = useState<Record<string, boolean>>({});
  const [state, setState] = useState(() => {
    const init: Record<
      string,
      { deductedMinutes: number; deductedCount: number; packageId: string; excusedCharge: boolean; status: string }
    > = {};
    for (const r of rows) {
      init[r.studentId] = {
        deductedMinutes: r.deductedMinutes ?? 0,
        deductedCount: r.deductedCount ?? 0,
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
      if (!pkg || pkg.remainingMinutes == null) continue;
      if (pkg.billingMode === "COUNT") {
        if ((st?.deductedCount ?? 0) > pkg.remainingMinutes) {
          map[r.studentId] = t(
            lang,
            `Insufficient: need ${st?.deductedCount ?? 0} / remaining ${pkg.remainingMinutes}`,
            `余额不足：需 ${st?.deductedCount ?? 0} 次 / 仅剩 ${pkg.remainingMinutes} 次`
          );
        }
      } else if (pkg.billingMode === "MINUTES") {
        if ((st?.deductedMinutes ?? 0) > pkg.remainingMinutes) {
          map[r.studentId] = t(
            lang,
            `Insufficient: need ${fmtMinutes(st?.deductedMinutes ?? 0)} / remaining ${fmtMinutes(pkg.remainingMinutes)}`,
            `余额不足：需 ${fmtMinutes(st?.deductedMinutes ?? 0)} / 仅剩 ${fmtMinutes(pkg.remainingMinutes)}`
          );
        }
      }
    }
    return map;
  }, [lang, rows, state]);

  const hasInsufficient = Object.keys(insuffMap).length > 0;
  const anomalyMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of rows) {
      const st = state[r.studentId];
      const pkg = r.packageOptions.find((p) => p.id === st?.packageId);
      const messages: string[] = [];

      if (!pkg && ((st?.deductedCount ?? 0) > 0 || (st?.deductedMinutes ?? 0) > 0)) {
        messages.push(
          t(lang, "No package selected but deduct value is filled.", "未选择课包但填写了扣减值。")
        );
      } else if (pkg?.billingMode === "COUNT" && (st?.deductedMinutes ?? 0) > 0) {
        messages.push(
          t(
            lang,
            "Count package uses deduct count. Deduct minutes should be 0.",
            "按次数课包应填写扣次数，扣分钟应为 0。"
          )
        );
      } else if (pkg?.billingMode === "MINUTES" && (st?.deductedCount ?? 0) > 0) {
        messages.push(
          t(
            lang,
            "Minutes package uses deduct minutes. Deduct count should be 0.",
            "按分钟课包应填写扣分钟，扣次数应为 0。"
          )
        );
      }

      if ((st?.status ?? r.status) === "UNMARKED" && ((st?.deductedCount ?? 0) > 0 || (st?.deductedMinutes ?? 0) > 0)) {
        messages.push(
          t(lang, "Status is UNMARKED but deduct value is not 0.", "状态为未点名，但扣减值不是 0。")
        );
      }

      if (messages.length) map[r.studentId] = messages.join(" ");
    }
    return map;
  }, [lang, rows, state]);
  const hasAnomaly = Object.keys(anomalyMap).length > 0;
  const issueCount = rows.filter((r) => Boolean(insuffMap[r.studentId] || anomalyMap[r.studentId])).length;
  const displayRows = showOnlyIssues ? rows.filter((r) => Boolean(insuffMap[r.studentId] || anomalyMap[r.studentId])) : rows;

  return (
    <>
      {hasInsufficient ? (
        <NoticeBanner
          type="warn"
          title={t(lang, "Insufficient balance", "余额不足")}
          message={t(lang, "Please adjust deduct values or choose another package.", "请调整扣减值或选择其他课包。")}
        />
      ) : null}
      {hasAnomaly ? (
        <NoticeBanner
          type="warn"
          title={t(lang, "Deduct value check", "扣减值检查")}
          message={t(
            lang,
            "Some rows look inconsistent. Please review red hints before saving.",
            "部分行存在不一致，请先检查红色提示后再保存。"
          )}
        />
      ) : null}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={showOnlyIssues}
            onChange={(e) => setShowOnlyIssues(e.target.checked)}
          />
          {t(lang, "Show only rows with issues", "仅显示有问题行")}
        </label>
        <span style={{ color: issueCount > 0 ? "#b00" : "#666", fontSize: 12 }}>
          {t(lang, "Issue rows", "问题行")} {issueCount}
        </span>
      </div>
      {showOnlyIssues && displayRows.length === 0 ? (
        <div style={{ marginBottom: 8, color: "#666", fontSize: 12 }}>
          {t(lang, "No issue rows now.", "当前没有问题行。")}
        </div>
      ) : null}

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
          {displayRows.map((r) => {
            const st = state[r.studentId];
            const pkg = r.packageOptions.find((p) => p.id === st?.packageId);
            const insufficient = insuffMap[r.studentId];
            const status = st?.status ?? r.status;
            const excusedCharge = Boolean(st?.excusedCharge);
            const canDeduct = isDeductableStatus(status, excusedCharge);
            const excusedCount = r.excusedBaseCount + (status === "EXCUSED" ? 1 : 0);
            const excusedEligible = excusedCount >= 4;
            const requiredCount = Math.max(1, Number(st?.deductedCount ?? 0) || 0);
            const requiredMinutes = Math.max(
              1,
              Number(st?.deductedMinutes ?? 0) || Number(r.suggestedDeductMinutes ?? 0) || 0
            );
            const recommendedPackages = r.packageOptions.filter((p) => {
              if (!canDeduct) return true;
              if (p.billingMode === "COUNT") return (p.remainingMinutes ?? 0) >= requiredCount;
              if (p.billingMode === "MINUTES") return (p.remainingMinutes ?? 0) >= requiredMinutes;
              return false;
            });
            const showAllPackages = Boolean(showAllPackagesByStudent[r.studentId]);
            const packageList =
              recommendedPackages.length > 0 && !showAllPackages ? recommendedPackages : r.packageOptions;

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
                    onChange={(e) => {
                      const nextStatus = e.target.value;
                      setState((s) => {
                        const prev = s[r.studentId];
                        if (!prev) return s;
                        const next = { ...prev, status: nextStatus };
                        const activePkg = r.packageOptions.find((p) => p.id === next.packageId);

                        if (nextStatus === "UNMARKED") {
                          next.deductedCount = 0;
                          next.deductedMinutes = 0;
                        } else if (nextStatus === "EXCUSED" && !next.excusedCharge) {
                          next.deductedCount = 0;
                          next.deductedMinutes = 0;
                        } else if (activePkg) {
                          const canDeduct = isDeductableStatus(nextStatus, Boolean(next.excusedCharge));
                          if (canDeduct) {
                            if (activePkg.billingMode === "COUNT") {
                              next.deductedCount = Math.max(1, Number(next.deductedCount ?? 0) || 0);
                              next.deductedMinutes = 0;
                            } else if (activePkg.billingMode === "MINUTES") {
                              if ((next.deductedMinutes ?? 0) <= 0) {
                                next.deductedMinutes = Math.max(0, Number(r.suggestedDeductMinutes ?? 0));
                              }
                              next.deductedCount = 0;
                            }
                          }
                        }
                        return { ...s, [r.studentId]: next };
                      });
                    }}
                    style={{ minWidth: 160 }}
                  >
                    <option value="UNMARKED">{t(lang, "UNMARKED", "未点名")}</option>
                    <option value="PRESENT">{t(lang, "PRESENT", "到课")}</option>
                    <option value="ABSENT">{t(lang, "ABSENT", "缺课")}</option>
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
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setState((s) => {
                              const prev = s[r.studentId];
                              if (!prev) return s;
                              const next = { ...prev, excusedCharge: checked };
                              const activePkg = r.packageOptions.find((p) => p.id === next.packageId);
                              if (!checked) {
                                next.deductedCount = 0;
                                next.deductedMinutes = 0;
                              } else if (activePkg?.billingMode === "COUNT") {
                                next.deductedCount = Math.max(1, Number(next.deductedCount ?? 0) || 0);
                                next.deductedMinutes = 0;
                              } else if (activePkg?.billingMode === "MINUTES") {
                                if ((next.deductedMinutes ?? 0) <= 0) {
                                  next.deductedMinutes = Math.max(0, Number(r.suggestedDeductMinutes ?? 0));
                                }
                                next.deductedCount = 0;
                              }
                              return { ...s, [r.studentId]: next };
                            });
                          }}
                        />
                        {t(lang, "Charge", "扣费")}
                      </label>
                    ) : (
                      <span style={{ color: "#666" }}>{t(lang, "No charge", "免扣")}</span>
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
                    onChange={(e) => {
                      const nextPackageId = e.target.value;
                      const nextPkg = r.packageOptions.find((p) => p.id === nextPackageId);
                      setState((s) => {
                        const prev = s[r.studentId];
                        if (!prev) return s;
                        const next = { ...prev, packageId: nextPackageId };
                        if (nextPkg?.billingMode === "COUNT") {
                          if ((prev.deductedCount ?? 0) <= 0) next.deductedCount = 1;
                          next.deductedMinutes = 0;
                        } else if (nextPkg?.billingMode === "MINUTES") {
                          if ((prev.deductedMinutes ?? 0) <= 0) {
                            next.deductedMinutes = Math.max(0, Number(r.suggestedDeductMinutes ?? 0));
                          }
                          next.deductedCount = 0;
                        }
                        return { ...s, [r.studentId]: next };
                      });
                    }}
                    style={{ minWidth: 220 }}
                  >
                    <option value="">{t(lang, "(none)", "(无)")}</option>
                    {packageList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {recommendedPackages.length > 0 && recommendedPackages.length < r.packageOptions.length ? (
                    <div style={{ marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllPackagesByStudent((prev) => ({
                            ...prev,
                            [r.studentId]: !Boolean(prev[r.studentId]),
                          }))
                        }
                        style={{ fontSize: 12 }}
                      >
                        {showAllPackages
                          ? t(lang, "Show recommended only", "仅显示推荐可扣课包")
                          : t(lang, "Show all packages", "显示全部课包")}
                      </button>
                    </div>
                  ) : null}
                  {pkg?.validToLabel && (
                    <div style={{ color: "#999", fontSize: 12 }}>
                      {t(lang, "Valid until", "有效期至")} {pkg.validToLabel}
                    </div>
                  )}
                </td>

                <td>
                  <div style={{ fontWeight: insufficient ? 700 : 400, color: insufficient ? "#b00" : undefined }}>
                    {pkg?.billingMode === "COUNT"
                      ? `${pkg?.remainingMinutes ?? 0} cls`
                      : fmtMinutes(pkg?.remainingMinutes ?? null)}
                  </div>
                  {status === "EXCUSED" && !excusedCharge ? (
                    <div style={{ color: "#166534", fontSize: 12 }}>
                      {t(lang, "This row is waived (no deduction).", "本行已免扣（不扣课时/次数）。")}
                    </div>
                  ) : null}
                  {insufficient && <div style={{ color: "#b00", fontSize: 12 }}>{insufficient}</div>}
                  {anomalyMap[r.studentId] && <div style={{ color: "#b00", fontSize: 12 }}>{anomalyMap[r.studentId]}</div>}
                </td>

                <td>
                  <input
                    name={`dc:${r.studentId}`}
                    type="number"
                    min={0}
                    step={1}
                    disabled={pkg?.billingMode === "MINUTES" || !canDeduct}
                    value={st?.deductedCount ?? 0}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        [r.studentId]: { ...s[r.studentId], deductedCount: Number(e.target.value || 0) },
                      }))
                    }
                    style={{ width: 120 }}
                  />
                </td>

                <td>
                  <input
                    name={`dm:${r.studentId}`}
                    type="number"
                    min={0}
                    step={15}
                    disabled={pkg?.billingMode === "COUNT" || !canDeduct}
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

      <div style={{ marginTop: 12, color: "#666" }}>
        {t(lang, "Saving will deduct package balance and record ledger.", "保存时将扣减课包余额并记录流水。")}
      </div>
    </>
  );
}
