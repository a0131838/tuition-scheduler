"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SearchableMultiSelect from "./SearchableMultiSelect";
import DateTimeSplitInput from "@/app/_components/DateTimeSplitInput";
import { formatBusinessDateOnly } from "@/lib/date-only";

type Labels = {
  edit: string;
  update: string;
  topUp: string;
  topUpMinutes: string;
  topUpNote: string;
  topUpSubmit: string;
  deleteLabel: string;
  paid: string;
  paidAt: string;
  paidAmount: string;
  paidNote: string;
  sharedStudents: string;
  sharedCourses: string;
  remaining: string;
  validFrom: string;
  validTo: string;
  status: string;
  settlementMode?: string;
  settlementNone?: string;
  settlementOnline?: string;
  settlementOffline?: string;
  note: string;
  close: string;
  deleteConfirm: string;
};

type PackageRow = {
  id: string;
  studentId?: string | null;
  courseId?: string | null;
  type?: string | null;
  totalMinutes?: number | null;
  studentName?: string | null;
  courseName?: string | null;
  sourceChannelName?: string | null;
  remainingMinutes: number | null;
  validFrom: Date;
  validTo: Date | null;
  status: string;
  settlementMode: "ONLINE_PACKAGE_END" | "OFFLINE_MONTHLY" | null;
  paid: boolean;
  paidAt: Date | null;
  paidAmount: number | null;
  paidNote: string | null;
  sharedStudents: Array<{ studentId: string }>;
  sharedCourses: Array<{ courseId: string }>;
  note: string | null;
};

const STANDARD_TOP_UP_PRESETS = [
  { minutes: 600, label: "10h / 10小时" },
  { minutes: 1200, label: "20h / 20小时" },
  { minutes: 2400, label: "40h / 40小时" },
  { minutes: 6000, label: "100h / 100小时" },
] as const;

const XDF_TOP_UP_PRESETS = [
  { minutes: 270, label: "6 lessons / 6课时" },
  { minutes: 360, label: "8 lessons / 8课时" },
  { minutes: 450, label: "10 lessons / 10课时" },
  { minutes: 900, label: "20 lessons / 20课时" },
  { minutes: 1800, label: "40 lessons / 40课时" },
] as const;

export default function PackageEditModal({
  pkg,
  students,
  courses,
  labels,
}: {
  pkg: PackageRow;
  students: Array<{ id: string; name: string; sourceChannelName?: string; activePackageCount?: number }>;
  courses: Array<{ id: string; name: string }>;
  labels: Labels;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [hover, setHover] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const [mode, setMode] = useState<"edit" | "topup">("edit");
  const [editPaidValue, setEditPaidValue] = useState(pkg.paid);
  const [showEditAdvanced, setShowEditAdvanced] = useState(false);
  const [topUpMinutesValue, setTopUpMinutesValue] = useState(
    () => (((pkg.sourceChannelName ?? "").includes("新东方") ? "270" : "600"))
  );
  const [topUpNoteValue, setTopUpNoteValue] = useState("");
  const [topUpPaidValue, setTopUpPaidValue] = useState(false);
  const [topUpPaidAmountValue, setTopUpPaidAmountValue] = useState("");
  const [editSharedStudentIds, setEditSharedStudentIds] = useState(() =>
    pkg.sharedStudents.map((s) => s.studentId)
  );
  const [editSharedCourseIds, setEditSharedCourseIds] = useState(() =>
    pkg.sharedCourses.map((c) => c.courseId)
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settlementModeLabel = labels.settlementMode ?? "Settlement Mode";
  const settlementNoneLabel = labels.settlementNone ?? "Not Included";
  const settlementOnlineLabel = labels.settlementOnline ?? "Online: Package End";
  const settlementOfflineLabel = labels.settlementOffline ?? "Offline: Monthly";
  const isXdfPartner = (pkg.sourceChannelName ?? "").includes("新东方");
  const topUpPresets = isXdfPartner ? XDF_TOP_UP_PRESETS : STANDARD_TOP_UP_PRESETS;
  const currentRemaining = pkg.remainingMinutes ?? 0;
  const currentTotal = pkg.totalMinutes ?? null;
  const topUpMinutesNumber = Number(topUpMinutesValue || 0);
  const nextRemaining = topUpMinutesNumber > 0 ? currentRemaining + topUpMinutesNumber : currentRemaining;
  const nextTotal =
    currentTotal != null && topUpMinutesNumber > 0 ? currentTotal + topUpMinutesNumber : currentTotal;
  const topUpSummaryRows = useMemo(
    () => [
      {
        label: "Package / 课包",
        value: `${pkg.studentName ?? "-"} · ${pkg.courseName ?? "-"}`,
      },
      {
        label: "Before top-up / 增购前剩余",
        value: String(currentRemaining),
      },
      {
        label: "Add now / 本次增加",
        value: topUpMinutesNumber > 0 ? String(topUpMinutesNumber) : "0",
      },
      {
        label: "After top-up / 增购后剩余",
        value: String(nextRemaining),
      },
      {
        label: "Total package balance / 课包总量",
        value: nextTotal != null ? `${currentTotal ?? 0} → ${nextTotal}` : "Not tracked / 未记录",
      },
    ],
    [currentRemaining, currentTotal, nextRemaining, nextTotal, pkg.courseName, pkg.studentName, topUpMinutesNumber]
  );
  const sharedStudentOptions = useMemo(
    () =>
      students.map((student) => ({
        id: student.id,
        label: student.name,
        description: [
          student.sourceChannelName ? `Source / 来源: ${student.sourceChannelName}` : null,
          typeof student.activePackageCount === "number"
            ? `Active / 有效课包: ${student.activePackageCount}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        searchText: [student.name, student.id, student.sourceChannelName].filter(Boolean).join(" "),
      })),
    [students]
  );
  const sharedCourseOptions = useMemo(
    () =>
      courses.map((course) => ({
        id: course.id,
        label: course.name,
        searchText: `${course.name} ${course.id}`,
      })),
    [courses]
  );

  const preserveRefresh = (okMsg?: string) => {
    if (okMsg) {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.delete("err");
      params.set("msg", okMsg);
      const target = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(target, { scroll: false });
    }
    const y = window.scrollY;
    router.refresh();
    requestAnimationFrame(() => window.scrollTo(0, y));
  };

  return (
    <>
      <span
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        <button
          type="button"
          title={labels.edit}
          onClick={() => dialogRef.current?.showModal()}
          style={{
            opacity: hover ? 1 : 0.7,
            border: "1px solid #f0b266",
            borderRadius: 6,
            padding: "4px 8px",
            cursor: "pointer",
            background: hover ? "#fff3e0" : "#fff7ed",
            fontSize: 13,
            fontWeight: 700,
            color: "#b45309",
          }}
        >
          ✎ {labels.edit}
        </button>
      </span>
      <dialog
        ref={dialogRef}
        style={{ padding: 16, borderRadius: 8, border: "1px solid #ddd", minWidth: 420 }}
        onClose={() => {
          setErr("");
          setMsg("");
          setMode("edit");
          setEditPaidValue(pkg.paid);
          setShowEditAdvanced(false);
          setTopUpMinutesValue(String(topUpPresets[0]?.minutes ?? 600));
          setTopUpNoteValue("");
          setTopUpPaidValue(false);
          setTopUpPaidAmountValue("");
          setEditSharedStudentIds(pkg.sharedStudents.map((s) => s.studentId));
          setEditSharedCourseIds(pkg.sharedCourses.map((c) => c.courseId));
          setContentKey((v) => v + 1);
        }}
      >
        <div key={contentKey}>
        <form method="dialog" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b>{labels.edit}</b>
          <button type="submit">{labels.close}</button>
        </form>

        {err ? <div style={{ color: "#b00", marginTop: 10 }}>{err}</div> : null}
        {msg ? <div style={{ color: "#087", marginTop: 10 }}>{msg}</div> : null}

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setMode("edit")}
            style={{
              borderRadius: 999,
              padding: "8px 14px",
              border: mode === "edit" ? "2px solid #2563eb" : "1px solid #cbd5e1",
              background: mode === "edit" ? "#dbeafe" : "#fff",
              fontWeight: 700,
            }}
          >
            Edit package / 编辑课包
          </button>
          <button
            type="button"
            onClick={() => setMode("topup")}
            style={{
              borderRadius: 999,
              padding: "8px 14px",
              border: mode === "topup" ? "2px solid #2563eb" : "1px solid #cbd5e1",
              background: mode === "topup" ? "#dbeafe" : "#fff",
              fontWeight: 700,
            }}
          >
            {labels.topUp} / 增购
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            border: "1px solid #dbeafe",
            borderRadius: 14,
            padding: 14,
            background: "#eff6ff",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 700, color: "#1d4ed8" }}>
            {mode === "edit"
              ? "You are editing this package / 你正在编辑这个课包"
              : "You are topping up this package / 你正在给这个课包增购"}
          </div>
          <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div>
              <div style={{ fontSize: 12, color: "#475569" }}>Student / 学生</div>
              <strong>{pkg.studentName ?? "-"}</strong>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#475569" }}>Course / 课程</div>
              <strong>{pkg.courseName ?? "-"}</strong>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#475569" }}>Source / 来源</div>
              <strong>{pkg.sourceChannelName ?? "Standard / 常规"}</strong>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#475569" }}>Status / 状态</div>
              <strong>{pkg.status}</strong>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#475569" }}>Remaining / 剩余</div>
              <strong>{currentRemaining}</strong>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#475569" }}>Total / 总量</div>
              <strong>{currentTotal ?? "Not tracked / 未记录"}</strong>
            </div>
          </div>
        </div>

        {mode === "edit" ? (
        <form
          style={{ display: "grid", gap: 8, marginTop: 12 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setErr("");
            setBusy(true);
            try {
              const fd = new FormData(e.currentTarget);
              const id = String(fd.get("id") ?? "");
              const payload = {
                status: String(fd.get("status") ?? ""),
                settlementMode: String(fd.get("settlementMode") ?? ""),
                validFrom: String(fd.get("validFrom") ?? ""),
                validTo: String(fd.get("validTo") ?? ""),
                paid: String(fd.get("paid") ?? "") === "on",
                paidAt: String(fd.get("paidAt") ?? ""),
                paidAmount: String(fd.get("paidAmount") ?? ""),
                paidNote: String(fd.get("paidNote") ?? ""),
                sharedStudentIds: fd.getAll("sharedStudentIds").map((v) => String(v)),
                sharedCourseIds: fd.getAll("sharedCourseIds").map((v) => String(v)),
                note: String(fd.get("note") ?? ""),
              };

              const res = await fetch(`/api/admin/packages/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = (await res.json().catch(() => null)) as any;
              if (!res.ok || !data?.ok) {
                setErr(String(data?.message ?? `Request failed (${res.status})`));
                return;
              }

              dialogRef.current?.close();
              preserveRefresh("Saved");
            } finally {
              setBusy(false);
            }
          }}
        >
          <input type="hidden" name="id" value={pkg.id} />
          <div style={{ color: "#666", fontSize: 13 }}>
            {labels.remaining}: {pkg.remainingMinutes == null ? "-" : pkg.remainingMinutes}
            <div style={{ marginTop: 4, color: "#92400e" }}>
              Remaining balance is read-only here. If recorded incorrectly, delete and recreate the package. / 课时包剩余课时不可在此编辑；如录入错误，请删除后重新录入。
            </div>
          </div>
          <label>
            {labels.validFrom}:
            <input name="validFrom" type="date" defaultValue={formatBusinessDateOnly(new Date(pkg.validFrom))} style={{ marginLeft: 8 }} />
          </label>
          <label>
            {labels.validTo}:
            <input name="validTo" type="date" defaultValue={pkg.validTo ? formatBusinessDateOnly(new Date(pkg.validTo)) : ""} style={{ marginLeft: 8 }} />
          </label>
          <label>
            {labels.status}:
            <select name="status" defaultValue={pkg.status} style={{ marginLeft: 8 }}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </label>
          <label>
            {settlementModeLabel}:
            <select name="settlementMode" defaultValue={pkg.settlementMode ?? ""} style={{ marginLeft: 8 }}>
              <option value="">{settlementNoneLabel}</option>
              <option value="ONLINE_PACKAGE_END">{settlementOnlineLabel}</option>
              <option value="OFFLINE_MONTHLY">{settlementOfflineLabel}</option>
            </select>
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              name="paid"
              checked={editPaidValue}
              onChange={(e) => setEditPaidValue(e.target.checked)}
            />
            {labels.paid}
          </label>
          {editPaidValue ? (
            <>
              <label>
                {labels.paidAt}:
                <DateTimeSplitInput
                  name="paidAt"
                  defaultValue={pkg.paidAt ? pkg.paidAt.toISOString().slice(0, 16) : ""}
                  wrapperStyle={{ marginLeft: 8 }}
                />
              </label>
              <label>
                {labels.paidAmount}:
                <input name="paidAmount" type="number" min={0} step={1} defaultValue={pkg.paidAmount ?? ""} style={{ marginLeft: 8 }} />
              </label>
              <label>
                {labels.paidNote}:
                <input name="paidNote" type="text" defaultValue={pkg.paidNote ?? ""} style={{ marginLeft: 8, width: "100%" }} />
              </label>
            </>
          ) : null}

          <details
            open={showEditAdvanced}
            onToggle={(e) => setShowEditAdvanced((e.currentTarget as HTMLDetailsElement).open)}
            style={{ border: "1px dashed #cbd5e1", borderRadius: 12, padding: 12 }}
          >
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              Less-common fields / 不常改字段
            </summary>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <label>
                {labels.sharedStudents}:
                <div style={{ marginTop: 8 }}>
                  <SearchableMultiSelect
                    name="sharedStudentIds"
                    options={sharedStudentOptions}
                    selectedIds={editSharedStudentIds}
                    onChange={setEditSharedStudentIds}
                    excludeIds={pkg.studentId ? [pkg.studentId] : []}
                    searchPlaceholder="Search student name / 搜索学生姓名"
                    selectedTitle="Selected shared students / 已选共享学生"
                    emptyText="No matching students. / 没有匹配的学生。"
                  />
                </div>
              </label>
              <label>
                {labels.sharedCourses}:
                <div style={{ marginTop: 8 }}>
                  <SearchableMultiSelect
                    name="sharedCourseIds"
                    options={sharedCourseOptions}
                    selectedIds={editSharedCourseIds}
                    onChange={setEditSharedCourseIds}
                    excludeIds={pkg.courseId ? [pkg.courseId] : []}
                    searchPlaceholder="Search course name / 搜索课程名称"
                    selectedTitle="Selected shared courses / 已选共享课程"
                    emptyText="No matching courses. / 没有匹配的课程。"
                  />
                </div>
              </label>
              <label>
                {labels.note}:
                <input name="note" type="text" defaultValue={pkg.note ?? ""} style={{ marginLeft: 8, width: "100%" }} />
              </label>
            </div>
          </details>

          <button type="submit" disabled={busy}>
            {busy ? `${labels.update}...` : labels.update}
          </button>
        </form>
        ) : (
        <form
          style={{ display: "grid", gap: 8, marginTop: 12 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setErr("");
            setBusy(true);
            try {
              const fd = new FormData(e.currentTarget);
              const id = String(fd.get("id") ?? "");
              const payload = {
                addMinutes: Number(fd.get("addMinutes") ?? 0),
                note: String(fd.get("note") ?? ""),
                paid: String(fd.get("paid") ?? "") === "on",
                paidAt: String(fd.get("paidAt") ?? ""),
                paidAmount: String(fd.get("paidAmount") ?? ""),
                paidNote: String(fd.get("paidNote") ?? ""),
              };

              const res = await fetch(`/api/admin/packages/${encodeURIComponent(id)}/top-up`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = (await res.json().catch(() => null)) as any;
              if (!res.ok || !data?.ok) {
                setErr(String(data?.message ?? `Request failed (${res.status})`));
                return;
              }

              dialogRef.current?.close();
              preserveRefresh("Saved");
            } finally {
              setBusy(false);
            }
          }}
        >
          <b>{labels.topUp} / 增购课时</b>
          <input type="hidden" name="id" value={pkg.id} />
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#f8fafc", display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Top-up summary / 增购摘要</div>
            {topUpSummaryRows.map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                <span style={{ color: "#475569" }}>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            Use top-up only to add balance. Do not use it to correct the original package. / 增购只用于增加课时，不应用来修正原始课包录入。
          </div>
          <div style={{ border: "1px solid #f59e0b", borderRadius: 12, padding: 12, background: "#fff7ed", color: "#9a3412" }}>
            You are adding <strong>{topUpMinutesNumber > 0 ? topUpMinutesNumber : 0}</strong> minutes to{" "}
            <strong>{pkg.studentName ?? "this student"}</strong>'s <strong>{pkg.courseName ?? "package"}</strong>.
            Remaining balance will change from <strong>{currentRemaining}</strong> to <strong>{nextRemaining}</strong>. /
            你正在给 <strong>{pkg.studentName ?? "该学生"}</strong> 的 <strong>{pkg.courseName ?? "课包"}</strong> 增加{" "}
            <strong>{topUpMinutesNumber > 0 ? topUpMinutesNumber : 0}</strong> 分钟，剩余课时将从{" "}
            <strong>{currentRemaining}</strong> 变成 <strong>{nextRemaining}</strong>。
          </div>
          <label>
            {labels.topUpMinutes}:
            <input
              name="addMinutes"
              type="number"
              min={1}
              step={1}
              value={topUpMinutesValue}
              onChange={(e) => setTopUpMinutesValue(e.target.value)}
              style={{ marginLeft: 8 }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {topUpPresets.map((preset) => (
              <button
                key={preset.minutes}
                type="button"
                onClick={() => setTopUpMinutesValue(String(preset.minutes))}
                style={{
                  minHeight: 34,
                  padding: "0 12px",
                  borderRadius: 999,
                  border: topUpMinutesValue === String(preset.minutes) ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: topUpMinutesValue === String(preset.minutes) ? "#dbeafe" : "#fff",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div style={{ color: isXdfPartner ? "#92400e" : "#475569", fontSize: 13 }}>
            {isXdfPartner
              ? "New Oriental partner packages usually follow 45-minute lesson bundles. / 新东方合作方课包通常按 45 分钟课时打包。"
              : "Regular top-ups usually follow 10h / 20h / 40h / 100h package sizes. / 常规增购通常按 10 / 20 / 40 / 100 小时录入。"}
          </div>
          <label>
            {labels.topUpNote}:
            <input
              name="note"
              type="text"
              value={topUpNoteValue}
              onChange={(e) => setTopUpNoteValue(e.target.value)}
              style={{ marginLeft: 8, width: "100%" }}
            />
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              name="paid"
              checked={topUpPaidValue}
              onChange={(e) => setTopUpPaidValue(e.target.checked)}
            />
            {labels.paid}
          </label>
          {topUpPaidValue ? (
            <>
              <label>
                {labels.paidAt}:
                <DateTimeSplitInput name="paidAt" defaultValue="" wrapperStyle={{ marginLeft: 8 }} />
              </label>
              <label>
                {labels.paidAmount}:
                <input
                  name="paidAmount"
                  type="number"
                  min={0}
                  step={1}
                  value={topUpPaidAmountValue}
                  onChange={(e) => setTopUpPaidAmountValue(e.target.value)}
                  style={{ marginLeft: 8 }}
                />
              </label>
              <label>
                {labels.paidNote}:
                <input name="paidNote" type="text" defaultValue="" style={{ marginLeft: 8, width: "100%" }} />
              </label>
            </>
          ) : null}
          <button type="submit" disabled={busy}>
            {busy ? `${labels.topUpSubmit}...` : labels.topUpSubmit}
          </button>
        </form>
        )}

        {mode === "edit" ? (
          <form
            onSubmit={(e) => {
              if (!window.confirm(labels.deleteConfirm)) e.preventDefault();
            }}
            style={{ marginTop: 12 }}
          >
            <input type="hidden" name="id" value={pkg.id} />
            <button
              type="button"
              disabled={busy}
              style={{ color: "#b00" }}
              onClick={async () => {
                if (busy) return;
                if (!window.confirm(labels.deleteConfirm)) return;
                setErr("");
                setBusy(true);
                try {
                  const res = await fetch(`/api/admin/packages/${encodeURIComponent(pkg.id)}`, { method: "DELETE" });
                  const data = (await res.json().catch(() => null)) as any;
                  if (!res.ok || !data?.ok) {
                    setErr(String(data?.message ?? `Request failed (${res.status})`));
                    return;
                  }
                  dialogRef.current?.close();
                  preserveRefresh("Deleted");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? `${labels.deleteLabel}...` : labels.deleteLabel}
            </button>
          </form>
        ) : null}
        </div>
      </dialog>
    </>
  );
}
