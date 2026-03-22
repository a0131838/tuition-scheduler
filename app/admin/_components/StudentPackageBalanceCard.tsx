"use client";

import { useEffect, useMemo, useState } from "react";

type PackageRow = {
  id: string;
  type: "HOURS" | "MONTHLY";
  remainingMinutes: number | null;
  validFrom: string;
  validTo: string | null;
  paid: boolean;
  canSchedule: boolean;
  lowBalance: boolean;
  packMode: "GROUP" | "HOURS";
  packVariant?: "MONTHLY" | "HOURS_MINUTES" | "GROUP_MINUTES" | "GROUP_COUNT";
};

function fmtMinutes(min?: number | null) {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtDate(v: string | null) {
  if (!v) return "(open)";
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "-";
}

function packLabel(row: PackageRow) {
  if (row.type === "MONTHLY" || row.packVariant === "MONTHLY") return "MONTHLY / 包月";
  if (row.packVariant === "GROUP_MINUTES") return "GROUP MINUTES / 班课分钟包";
  if (row.packVariant === "GROUP_COUNT") return "GROUP COUNT / 班课按次包(旧)";
  return row.packMode === "GROUP" ? "GROUP / 次数包" : "HOURS / 课时包";
}

function remainingLabel(row: PackageRow) {
  if (row.type === "MONTHLY") return "MONTHLY / 包月";
  if (row.packVariant === "GROUP_COUNT") return `${row.remainingMinutes ?? 0} cls`;
  return fmtMinutes(row.remainingMinutes);
}

export default function StudentPackageBalanceCard({
  studentId,
  courseId,
  startAt,
  durationMin,
  kind = "oneOnOne",
}: {
  studentId: string;
  courseId: string;
  startAt?: string;
  durationMin?: number;
  kind?: "oneOnOne" | "group";
}) {
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const needMinutes = useMemo(() => {
    const raw = Number(durationMin ?? 60);
    return Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 60;
  }, [durationMin]);
  const hasInsufficient = useMemo(() => rows.some((row) => !row.canSchedule), [rows]);
  const hasLowBalance = useMemo(() => rows.some((row) => row.lowBalance), [rows]);

  useEffect(() => {
    if (!studentId || !courseId) {
      setRows([]);
      setErr("");
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      courseId,
      kind,
      durationMin: String(needMinutes),
    });
    if (startAt) params.set("at", startAt);

    setLoading(true);
    setErr("");
    fetch(`/api/admin/students/${encodeURIComponent(studentId)}/package-balance-preview?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as any;
        if (!res.ok || !data?.ok) {
          throw new Error(String(data?.message ?? `Request failed (${res.status})`));
        }
        setRows(Array.isArray(data.rows) ? data.rows : []);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setErr(error instanceof Error ? error.message : "Failed to load package balance");
        setRows([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [studentId, courseId, startAt, needMinutes, kind]);

  if (!studentId || !courseId) return null;

  return (
    <div
      style={{
        border: hasInsufficient ? "1px solid #fca5a5" : hasLowBalance ? "1px solid #fdba74" : "1px solid #93c5fd",
        background: hasInsufficient ? "#fff7f7" : hasLowBalance ? "#fffaf0" : "#f8fbff",
        borderRadius: 8,
        padding: 10,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ fontWeight: 700 }}>课包余额预览 / Package Balance</div>
      <div style={{ fontSize: 12, color: "#475569" }}>
        本次时长: {needMinutes} 分钟 / Session length: {needMinutes} min
        {!startAt ? " | 未选开始时间，按当前时间口径显示" : ""}
      </div>
      {!loading && !err && rows.length > 0 ? (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 8px",
            borderRadius: 6,
            background: hasInsufficient ? "#fef2f2" : hasLowBalance ? "#fff7ed" : "#ecfdf3",
            color: hasInsufficient ? "#b91c1c" : hasLowBalance ? "#c2410c" : "#166534",
          }}
        >
          {hasInsufficient
            ? "当前有课包余额不足，请先确认是否仍要排课 / Insufficient balance detected."
            : hasLowBalance
            ? "当前可排，但余额偏低 / Schedulable, but balance is low."
            : "当前时长可排，余额正常 / Schedulable with healthy balance."}
        </div>
      ) : null}
      {loading ? <div style={{ fontSize: 12, color: "#475569" }}>正在检查课包余额 / Checking package balance...</div> : null}
      {err ? <div style={{ fontSize: 12, color: "#b91c1c" }}>{err}</div> : null}
      {!loading && !err && rows.length === 0 ? (
        <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>当前课程在该时间没有可用课包 / No active package for this course at the selected time.</div>
      ) : null}
      {!loading && !err && rows.length > 0 ? (
        <div style={{ display: "grid", gap: 6 }}>
          {rows.map((row, idx) => (
            <div
              key={row.id}
              style={{
                border: row.canSchedule ? (row.lowBalance ? "1px solid #fdba74" : "1px solid #cbd5e1") : "1px solid #fca5a5",
                borderRadius: 8,
                padding: 8,
                background: row.canSchedule ? (row.lowBalance ? "#fffaf0" : "#ffffff") : "#fff7f7",
              }}
            >
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <b>课包 {idx + 1}</b>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: row.type === "MONTHLY" ? "#ecfdf3" : "#eef2ff",
                    color: row.type === "MONTHLY" ? "#166534" : "#1d4ed8",
                  }}
                >
                  {packLabel(row)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: row.canSchedule ? "#ecfdf3" : "#fef2f2",
                    color: row.canSchedule ? "#166534" : "#b91c1c",
                  }}
                >
                  {row.canSchedule ? "当前时长可排 / Schedulable" : "当前时长不足 / Insufficient"}
                </span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#334155" }}>
                剩余:{" "}
                <span style={{ fontWeight: row.lowBalance ? 700 : 400, color: row.lowBalance ? "#b91c1c" : undefined }}>
                  {remainingLabel(row)}
                </span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#334155" }}>
                有效期: {fmtDate(row.validFrom)} ~ {fmtDate(row.validTo)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
