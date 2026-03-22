"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AttendanceEditor, { AttendanceRow } from "./AttendanceEditor";
import { formatBusinessDateTime } from "@/lib/date-only";

export default function AdminSessionAttendanceClient({
  sessionId,
  lang,
  rows,
  canMarkAll,
  labels,
}: {
  sessionId: string;
  lang: any;
  rows: AttendanceRow[];
  canMarkAll: boolean;
  labels: {
    title: string;
    markAllPresent: string;
    markAllPresentWaived: string;
    save: string;
    saving: string;
    saveErrorPrefix: string;
    markAllErrorPrefix: string;
    waiveDeduction: string;
    waiveHint: string;
    waiveReasonPlaceholder: string;
  };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [saving, setSaving] = useState(false);
  const initialWaiveDeduction = rows.some((row) => Boolean(row.waiveDeduction));
  const initialWaiveReason =
    rows.find((row) => row.waiveReason && row.waiveReason.trim())?.waiveReason ?? "Assessment lesson";
  const [waiveDeduction, setWaiveDeduction] = useState(initialWaiveDeduction);
  const [waiveReason, setWaiveReason] = useState(initialWaiveReason);
  const [review, setReview] = useState<{
    items: Array<{
      studentId: string;
      status: string;
      deductedMinutes: number;
      deductedCount: number;
      note: string;
      packageId: string;
      excusedCharge: boolean;
      waiveDeduction: boolean;
      waiveReason: string;
    }>;
    impactedStudents: number;
    totalMinutes: number;
    totalCount: number;
  } | null>(null);
  const [confirmCountdown, setConfirmCountdown] = useState(0);
  const [copyHint, setCopyHint] = useState("");
  const markAllLabel = waiveDeduction ? labels.markAllPresentWaived : labels.markAllPresent;
  const rowByStudent = new Map(rows.map((r) => [r.studentId, r]));

  useEffect(() => {
    if (!review || confirmCountdown <= 0) return;
    const timer = window.setTimeout(() => {
      setConfirmCountdown((x) => Math.max(0, x - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [review, confirmCountdown]);

  function refreshPreserveScroll() {
    const y = window.scrollY;
    router.refresh();
    // Give the browser a moment to paint the refreshed content before restoring scroll.
    setTimeout(() => window.scrollTo(0, y), 0);
  }

  async function markAll() {
    if (saving) return;
    const totalStudents = rows.length;
    const alreadyMarked = rows.filter((r) => r.status !== "UNMARKED").length;
    const absentOrExcused = rows.filter((r) => r.status === "ABSENT" || r.status === "EXCUSED").length;
    const partiallyMarked = alreadyMarked > 0 && alreadyMarked < totalStudents;
    const hardConfirmRequired = absentOrExcused > 0 || partiallyMarked;
    const title =
      lang === "EN"
        ? "High-risk action"
        : lang === "ZH"
          ? "高风险操作"
          : "High-risk action / 高风险操作";
    const modeLine = waiveDeduction
      ? lang === "EN"
        ? "Mode: Mark all as PRESENT (waived deduction)"
        : lang === "ZH"
          ? "模式：全部标记到课（免扣）"
          : "Mode / 模式: Mark all as PRESENT (waived deduction) / 全部标记到课（免扣）"
      : lang === "EN"
        ? "Mode: Mark all as PRESENT and auto deduct package"
        : lang === "ZH"
          ? "模式：全部标记到课并自动扣减课包"
          : "Mode / 模式: Mark all as PRESENT and auto deduct package / 全部标记到课并自动扣减课包";
    const hintLine =
      lang === "EN"
        ? "Please confirm all absences/excused students have been reviewed."
        : lang === "ZH"
          ? "请确认缺课/请假学生已核对，否则会批量误扣。"
          : "Please confirm all absences/excused students have been reviewed. / 请确认缺课/请假学生已核对，否则会批量误扣。";
    const msg =
      `${title}\n` +
      `${modeLine}\n` +
      `- Students in this session: ${totalStudents}\n` +
      `- Already marked rows: ${alreadyMarked}\n` +
      `- Existing ABSENT/EXCUSED rows: ${absentOrExcused}\n\n` +
      `${hintLine}\n\n` +
      (lang === "ZH" ? "确认继续？" : lang === "EN" ? "Continue?" : "Continue? / 确认继续？");
    if (!window.confirm(msg)) return;
    if (hardConfirmRequired) {
      const keyword = "MARK ALL";
      const promptLine =
        lang === "EN"
          ? `Type "${keyword}" to continue.`
          : lang === "ZH"
            ? `请输入 "${keyword}" 以继续。`
            : `Type "${keyword}" to continue. / 请输入 "${keyword}" 以继续。`;
      const typed = window.prompt(
        `${title}\n${lang === "ZH" ? "检测到高风险场景（已有缺课/请假或部分已点名）。" : "High-risk scenario detected (existing ABSENT/EXCUSED or partially marked rows)."}\n${promptLine}`,
        ""
      );
      if ((typed ?? "").trim().toUpperCase() !== keyword) {
        alert(lang === "ZH" ? "已取消批量点名。未通过确认词校验。" : "Mark all cancelled. Confirmation keyword mismatch.");
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}/attendance/mark-all-present`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ waiveDeduction, waiveReason }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Mark all failed"));
      refreshPreserveScroll();
    } catch (e: any) {
      alert(`${labels.markAllErrorPrefix}: ${e?.message ?? "Mark all failed"}`);
    } finally {
      setSaving(false);
    }
  }

  function buildItems(formData: FormData) {
    return rows.map((r) => ({
      studentId: r.studentId,
      status: String(formData.get(`status:${r.studentId}`) ?? r.status),
      deductedMinutes: Number(formData.get(`dm:${r.studentId}`) ?? r.deductedMinutes),
      deductedCount: Number(formData.get(`dc:${r.studentId}`) ?? r.deductedCount),
      note: String(formData.get(`note:${r.studentId}`) ?? r.note ?? ""),
      packageId: String(formData.get(`pkg:${r.studentId}`) ?? r.packageId ?? ""),
      excusedCharge: String(formData.get(`charge:${r.studentId}`) ?? "") === "on",
      waiveDeduction,
      waiveReason: waiveDeduction ? waiveReason : "",
    }));
  }

  function computeReviewWarnings(input: NonNullable<typeof review>) {
    const warnings: string[] = [];
    const studentWarnings: string[] = [];
    let expectedMinutesTotal = 0;
    let countModeRows = 0;
    let countModeTotal = 0;
    let minutesModeRows = 0;

    for (const item of input.items) {
      const row = rowByStudent.get(item.studentId);
      if (!row) continue;
      const pkg = row.packageOptions.find((p) => p.id === item.packageId);
      if (pkg?.billingMode === "MINUTES" && item.deductedMinutes > 0) {
        minutesModeRows += 1;
        expectedMinutesTotal += Math.max(0, Number(row.suggestedDeductMinutes ?? 0));
      }
      if (pkg?.billingMode === "COUNT" && item.deductedCount > 0) {
        countModeRows += 1;
        countModeTotal += item.deductedCount;
      }
      if (pkg?.billingMode === "MINUTES") {
        const suggested = Math.max(0, Number(row.suggestedDeductMinutes ?? 0));
        const hardLine = Math.max(30, Math.round(suggested * 1.5));
        if (suggested > 0 && item.deductedMinutes > hardLine) {
          studentWarnings.push(
            lang === "ZH"
              ? `${row.studentName}：分钟扣减 ${item.deductedMinutes}，建议约 ${suggested}`
              : lang === "EN"
                ? `${row.studentName}: minutes ${item.deductedMinutes}, suggested around ${suggested}`
                : `${row.studentName}: minutes/分钟 ${item.deductedMinutes}, suggested/建议 ${suggested}`
          );
        }
      }
      if (pkg?.billingMode === "COUNT") {
        const hardCount = 2;
        if (item.deductedCount > hardCount) {
          studentWarnings.push(
            lang === "ZH"
              ? `${row.studentName}：次数扣减 ${item.deductedCount}，常见为 1`
              : lang === "EN"
                ? `${row.studentName}: count ${item.deductedCount}, commonly 1`
                : `${row.studentName}: count/次数 ${item.deductedCount}, commonly/常见 1`
          );
        }
      }
    }

    if (minutesModeRows > 0 && expectedMinutesTotal > 0) {
      const highLine = Math.round(expectedMinutesTotal * 1.3);
      if (input.totalMinutes > highLine) {
        warnings.push(
          lang === "ZH"
            ? `分钟扣减偏高：当前 ${input.totalMinutes}，参考上限约 ${highLine}（班级时长合计 ${expectedMinutesTotal}）。`
            : lang === "EN"
              ? `Minutes deduction looks high: now ${input.totalMinutes}, suggested upper line around ${highLine} (session-duration sum ${expectedMinutesTotal}).`
              : `Minutes deduction looks high / 分钟扣减偏高: now ${input.totalMinutes}, suggested upper line around ${highLine} (session-duration sum ${expectedMinutesTotal}) / 当前 ${input.totalMinutes}，参考上限约 ${highLine}（班级时长合计 ${expectedMinutesTotal}）。`
        );
      }
    }

    if (countModeRows > 0) {
      const highCountLine = countModeRows * 2;
      if (countModeTotal > highCountLine) {
        warnings.push(
          lang === "ZH"
            ? `次数扣减偏高：当前总次数 ${countModeTotal}，常见范围约 ${countModeRows}-${highCountLine}。`
            : lang === "EN"
              ? `Count deduction looks high: total count ${countModeTotal}, common range about ${countModeRows}-${highCountLine}.`
              : `Count deduction looks high / 次数扣减偏高: total ${countModeTotal}, common range ${countModeRows}-${highCountLine} / 当前总次数 ${countModeTotal}，常见范围约 ${countModeRows}-${highCountLine}。`
        );
      }
    }

    return { warnings, studentWarnings };
  }

  function buildReviewChecklist(
    input: NonNullable<typeof review>,
    reviewWarnings: { warnings: string[]; studentWarnings: string[] }
  ) {
    const lines: string[] = [];
    lines.push(lang === "ZH" ? "【点名前异常复核清单】" : "Attendance Pre-Save Anomaly Checklist");
    lines.push(`${lang === "ZH" ? "生成时间" : "Generated at"}: ${formatBusinessDateTime(new Date(), true)}`);
    lines.push(
      lang === "ZH"
        ? `涉及扣减学生: ${input.impactedStudents} | 总分钟: ${input.totalMinutes} | 总次数: ${input.totalCount}`
        : `Students with deduction: ${input.impactedStudents} | Total minutes: ${input.totalMinutes} | Total count: ${input.totalCount}`
    );
    if (reviewWarnings.warnings.length > 0) {
      lines.push(lang === "ZH" ? "总体异常:" : "Overall warnings:");
      for (const w of reviewWarnings.warnings) lines.push(`- ${w}`);
    }
    if (reviewWarnings.studentWarnings.length > 0) {
      lines.push(lang === "ZH" ? "可疑学生:" : "Suspicious students:");
      for (const w of reviewWarnings.studentWarnings) lines.push(`- ${w}`);
    }
    lines.push(
      lang === "ZH"
        ? "请教务复核后再确认保存。"
        : "Please ask ops team to verify before final save."
    );
    return lines.join("\n");
  }

  function openPreSaveReview(formData: FormData) {
    const items = buildItems(formData);
    const impactedStudents = items.filter((item) => item.deductedMinutes > 0 || item.deductedCount > 0).length;
    const totalMinutes = items.reduce((sum, item) => sum + (item.deductedMinutes || 0), 0);
    const totalCount = items.reduce((sum, item) => sum + (item.deductedCount || 0), 0);
    setReview({ items, impactedStudents, totalMinutes, totalCount });
    setConfirmCountdown(3);
    setCopyHint("");
  }

  async function saveItems(
    items: Array<{
      studentId: string;
      status: string;
      deductedMinutes: number;
      deductedCount: number;
      note: string;
      packageId: string;
      excusedCharge: boolean;
      waiveDeduction: boolean;
      waiveReason: string;
    }>
  ) {
    if (saving) return;

    const rowByStudent = new Map(rows.map((r) => [r.studentId, r]));
    const blockingErrors: string[] = [];
    for (const item of items) {
      const row = rowByStudent.get(item.studentId);
      if (!row) continue;
      const pkg = row.packageOptions.find((p) => p.id === item.packageId);
      const deductible =
        item.status === "PRESENT" ||
        item.status === "LATE" ||
        item.status === "ABSENT" ||
        (item.status === "EXCUSED" && item.excusedCharge);

      if (item.status === "UNMARKED" && (item.deductedMinutes > 0 || item.deductedCount > 0)) {
        blockingErrors.push(`${row.studentName}: status is UNMARKED but deduction is not zero`);
      }
      if (pkg?.billingMode === "COUNT" && item.deductedMinutes > 0) {
        blockingErrors.push(`${row.studentName}: COUNT package cannot deduct minutes`);
      }
      if (pkg?.billingMode === "MINUTES" && item.deductedCount > 0) {
        blockingErrors.push(`${row.studentName}: MINUTES package cannot deduct count`);
      }
      if (!waiveDeduction && deductible && pkg?.billingMode === "MINUTES" && item.deductedMinutes <= 0) {
        blockingErrors.push(`${row.studentName}: minutes deduction must be greater than 0`);
      }
      if (!waiveDeduction && deductible && pkg?.billingMode === "COUNT" && item.deductedCount <= 0) {
        blockingErrors.push(`${row.studentName}: count deduction must be greater than 0`);
      }
    }
    if (blockingErrors.length > 0) {
      const preview = blockingErrors.slice(0, 8).join("\n");
      const more = blockingErrors.length > 8 ? `\n...and ${blockingErrors.length - 8} more` : "";
      const title = lang === "ZH" ? "保存已阻止：请先修正以下高风险错误" : "Save blocked: please fix high-risk deduction errors first";
      alert(`${title}\n${preview}${more}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}/attendance`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Save failed"));
      setReview(null);
      setConfirmCountdown(0);
      const nameMap = new Map(rows.map((row) => [row.studentId, row.studentName]));
      const receiptRows = Array.isArray(data?.receipt) ? data.receipt : [];
      const changed = receiptRows.filter(
        (r: any) => Number(r?.deductedMinutes ?? 0) > 0 || Number(r?.deductedCount ?? 0) > 0
      );
      const lines = changed.map((r: any) => {
        const name = nameMap.get(String(r?.studentId ?? "")) ?? String(r?.studentId ?? "");
        const min = Number(r?.deductedMinutes ?? 0);
        const cnt = Number(r?.deductedCount ?? 0);
        if (lang === "EN") return `${name}: minutes ${min}, count ${cnt}`;
        if (lang === "ZH") return `${name}：分钟 ${min}，次数 ${cnt}`;
        return `${name}: minutes/分钟 ${min}, count/次数 ${cnt}`;
      });
      if (lines.length > 0) {
        const previewLines = lines.slice(0, 15);
        const more = lines.length > 15
          ? lang === "EN"
            ? `\n...and ${lines.length - 15} more`
            : lang === "ZH"
              ? `\n...另有 ${lines.length - 15} 条`
              : `\n...and ${lines.length - 15} more / 另有 ${lines.length - 15} 条`
          : "";
        const title =
          lang === "EN"
            ? "Saved. Deduction receipt:"
            : lang === "ZH"
              ? "已保存。扣减回执："
              : "Saved. Deduction receipt / 已保存。扣减回执：";
        alert(`${title}\n${previewLines.join("\n")}${more}`);
      }
      refreshPreserveScroll();
    } catch (e: any) {
      alert(`${labels.saveErrorPrefix}: ${e?.message ?? "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div
        style={{
          border: "1px solid #f59e0b",
          background: "#fffbeb",
          borderRadius: 8,
          padding: 10,
          marginBottom: 10,
          color: "#92400e",
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          {lang === "EN"
            ? "Operation Checklist"
            : lang === "ZH"
              ? "操作防呆清单"
              : "Operation Checklist / 操作防呆清单"}
        </div>
        <div>
          {lang === "EN"
            ? "1) Confirm ABSENT/EXCUSED first, then use Mark All Present only for true full-attendance classes."
            : lang === "ZH"
              ? "1）先确认缺课/请假，再使用“全部到课”；只适用于确实全员到课的班。"
              : "1) Confirm ABSENT/EXCUSED first, then use Mark All Present only for true full-attendance classes. / 先确认缺课/请假，再使用“全部到课”；只适用于确实全员到课的班。"}
        </div>
        <div>
          {lang === "EN"
            ? "2) Minutes package deducts minutes; count package deducts count. Avoid manual cross-input."
            : lang === "ZH"
              ? "2）分钟包扣分钟，次数包扣次数；避免手动交叉填写。"
              : "2) Minutes package deducts minutes; count package deducts count. Avoid manual cross-input. / 分钟包扣分钟，次数包扣次数；避免手动交叉填写。"}
        </div>
        <div>
          {lang === "EN"
            ? "3) For assessment lessons, enable Waive deduction to keep attendance without deduction."
            : lang === "ZH"
              ? "3）评估课请开启免扣，保留点名但不扣课包。"
              : "3) For assessment lessons, enable Waive deduction to keep attendance without deduction. / 评估课请开启免扣，保留点名但不扣课包。"}
        </div>
      </div>
      <div
        style={{
          border: "1px solid #fde68a",
          background: "#fffbeb",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
          display: "grid",
          gap: 8,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={waiveDeduction}
            onChange={(e) => setWaiveDeduction(e.target.checked)}
          />
          {labels.waiveDeduction}
        </label>
        <div style={{ color: "#666", fontSize: 12 }}>
          {labels.waiveHint}
        </div>
        <input
          type="text"
          value={waiveReason}
          onChange={(e) => setWaiveReason(e.target.value)}
          placeholder={labels.waiveReasonPlaceholder}
          disabled={!waiveDeduction}
          style={{ maxWidth: 360 }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700 }}>{labels.title}</div>
      </div>
      {canMarkAll && (
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fff1f2",
            borderRadius: 8,
            padding: 10,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ color: "#9f1239", fontSize: 12, fontWeight: 600 }}>
            {lang === "EN"
              ? "High-impact action: this can update all students in one click."
              : lang === "ZH"
                ? "高影响操作：一次点击会批量修改全班点名。"
                : "High-impact action: this can update all students in one click. / 高影响操作：一次点击会批量修改全班点名。"}
          </div>
          <button
            type="button"
            onClick={markAll}
            disabled={saving}
            style={{
              border: "1px solid #e11d48",
              color: "#9f1239",
              background: "#fff",
              borderRadius: 8,
              padding: "8px 12px",
              fontWeight: 700,
            }}
          >
            {saving ? labels.saving : markAllLabel}
          </button>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          openPreSaveReview(new FormData(e.currentTarget));
        }}
      >
        <AttendanceEditor lang={lang} rows={rows} />
        {review && (
          (() => {
            const reviewWarnings = computeReviewWarnings(review);
            return (
          <div
            style={{
              marginTop: 12,
              border: "1px solid #f59e0b",
              background: "#fffbeb",
              borderRadius: 8,
              padding: 10,
            }}
          >
            <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 6 }}>
              {lang === "EN"
                ? "3-second pre-save check"
                : lang === "ZH"
                  ? "保存前 3 秒检查"
                  : "3-second pre-save check / 保存前 3 秒检查"}
            </div>
            <div style={{ fontSize: 13, color: "#78350f", marginBottom: 8, lineHeight: 1.45 }}>
              {lang === "EN"
                ? `Students with deduction: ${review.impactedStudents} | Total minutes: ${review.totalMinutes} | Total count: ${review.totalCount}`
                : lang === "ZH"
                  ? `涉及扣减学生：${review.impactedStudents} | 扣减总分钟：${review.totalMinutes} | 扣减总次数：${review.totalCount}`
                  : `Students with deduction / 涉及扣减学生：${review.impactedStudents} | Total minutes / 扣减总分钟：${review.totalMinutes} | Total count / 扣减总次数：${review.totalCount}`}
            </div>
            {reviewWarnings.warnings.length > 0 || reviewWarnings.studentWarnings.length > 0 ? (
              <div
                style={{
                  marginBottom: 8,
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #ef4444",
                  background: "#fef2f2",
                  color: "#991b1b",
                  fontSize: 12,
                  lineHeight: 1.45,
                  fontWeight: 600,
                }}
              >
                {reviewWarnings.warnings.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
                {reviewWarnings.studentWarnings.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ marginBottom: 2 }}>
                      {lang === "ZH"
                        ? "可疑学生："
                        : lang === "EN"
                          ? "Suspicious students:"
                          : "Suspicious students / 可疑学生："}
                    </div>
                    {reviewWarnings.studentWarnings.slice(0, 8).map((line, idx) => (
                      <div key={`s-${idx}`}>- {line}</div>
                    ))}
                    {reviewWarnings.studentWarnings.length > 8 && (
                      <div>
                        {lang === "ZH"
                          ? `...另有 ${reviewWarnings.studentWarnings.length - 8} 人`
                          : lang === "EN"
                            ? `...and ${reviewWarnings.studentWarnings.length - 8} more`
                            : `...and ${reviewWarnings.studentWarnings.length - 8} more / 另有 ${reviewWarnings.studentWarnings.length - 8} 人`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
            {reviewWarnings.warnings.length > 0 || reviewWarnings.studentWarnings.length > 0 ? (
              <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(buildReviewChecklist(review, reviewWarnings));
                      setCopyHint(
                        lang === "ZH"
                          ? "已复制复核清单，可直接粘贴到群里。"
                          : lang === "EN"
                            ? "Checklist copied. You can paste it to your team chat."
                            : "Checklist copied / 已复制复核清单，可直接粘贴到群里。"
                      );
                    } catch {
                      setCopyHint(
                        lang === "ZH"
                          ? "复制失败，请手动截图发送。"
                          : lang === "EN"
                            ? "Copy failed. Please share screenshot manually."
                            : "Copy failed / 复制失败，请手动截图发送。"
                      );
                    }
                  }}
                >
                  {lang === "ZH"
                    ? "复制异常复核清单"
                    : lang === "EN"
                      ? "Copy anomaly checklist"
                      : "Copy anomaly checklist / 复制异常复核清单"}
                </button>
                {copyHint ? <span style={{ fontSize: 12, color: "#7c2d12" }}>{copyHint}</span> : null}
              </div>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setReview(null);
                  setConfirmCountdown(0);
                }}
                disabled={saving}
              >
                {lang === "ZH" ? "取消" : lang === "EN" ? "Cancel" : "Cancel / 取消"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const form = formRef.current;
                  if (!form) {
                    saveItems(review.items);
                    return;
                  }
                  saveItems(buildItems(new FormData(form)));
                }}
                disabled={saving || confirmCountdown > 0}
                style={{
                  border: "1px solid #1d4ed8",
                  background: "#2563eb",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontWeight: 700,
                }}
              >
                {saving
                  ? labels.saving
                  : confirmCountdown > 0
                    ? lang === "ZH"
                      ? `${confirmCountdown} 秒后可确认`
                      : lang === "EN"
                        ? `Confirm in ${confirmCountdown}s`
                        : `Confirm in ${confirmCountdown}s / ${confirmCountdown} 秒后可确认`
                    : lang === "ZH"
                      ? "确认保存"
                      : lang === "EN"
                        ? "Confirm Save"
                        : "Confirm Save / 确认保存"}
              </button>
            </div>
          </div>
            );
          })()
        )}
        <div style={{ marginTop: 12 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              border: "1px solid #1d4ed8",
              background: "#2563eb",
              color: "#fff",
              borderRadius: 8,
              padding: "9px 16px",
              fontWeight: 700,
            }}
          >
            {saving ? labels.saving : labels.save}
          </button>
        </div>
      </form>
    </div>
  );
}
