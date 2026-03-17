import { requireAdmin } from "@/lib/auth";
import { getLang, t, type Lang } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { packageModeFromNote, type PackageMode } from "@/lib/package-mode";
import { coursePackageAccessibleByStudent, coursePackageMatchesCourse } from "@/lib/package-sharing";
import { logAudit } from "@/lib/audit-log";
import { PackageStatus, PackageType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const DEDUCT_STATUSES = new Set(["PRESENT", "LATE", "ABSENT"]);

type RepairPackageCandidate = {
  id: string;
  note: string | null;
  remainingMinutes: number;
  studentId: string;
  mode: PackageMode;
  sharedStudents: Array<{ id: string }>;
};

type ReportRow = Awaited<ReturnType<typeof loadCandidateRows>>[number];

type RepairPreviewItem = {
  attendanceId: string;
  studentName: string;
  sessionAt: Date;
  needUnits: number;
  unitLabel: "minutes" | "classes";
  packageId: string | null;
  beforeRemaining: number | null;
  afterRemaining: number | null;
  canApply: boolean;
  reason: string | null;
  ledgerNote: string;
};

type BatchFailureDetail = {
  attendanceId: string;
  studentName: string;
  sessionAt: string;
  reason: string;
};

function isCompletedSession(x: {
  session: {
    teacherId: string | null;
    class: { teacherId: string };
    attendances: Array<{ status: string }>;
    feedbacks: Array<{ teacherId: string; content: string }>;
  };
}) {
  const hasRows = x.session.attendances.length > 0;
  const allMarked = x.session.attendances.every((a) => a.status !== "UNMARKED");
  const effectiveTeacherId = x.session.teacherId ?? x.session.class.teacherId;
  const hasFeedback = x.session.feedbacks.some(
    (f) => f.teacherId === effectiveTeacherId && String(f.content ?? "").trim().length > 0
  );
  return hasRows && allMarked && hasFeedback;
}

function durationMinutes(startAt: Date, endAt: Date) {
  return Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
}

function buildRepairLedgerNote(attendanceId: string) {
  return `Auto repair from undeducted completed report. attendanceId=${attendanceId}`;
}

function parseSearchMulti(v?: string | string[]) {
  if (!v) return [];
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [String(v).trim()].filter(Boolean);
}

function previewReasonLabel(lang: Lang, reason: string | null) {
  switch (reason) {
    case "invalid-duration":
      return t(lang, "Invalid duration", "课时长度无效");
    case "no-package":
      return t(lang, "No package", "无可用课包");
    case "insufficient-package-balance":
      return t(lang, "Insufficient package balance", "课包余额不足");
    case "insufficient-after-batch-order":
      return t(lang, "Insufficient after batch ordering", "批量顺序下余额不足");
    default:
      return reason ? `${t(lang, "Blocked", "阻塞")}: ${reason}` : t(lang, "Blocked", "阻塞");
  }
}

function riskRank(reason: string | null, canApply: boolean) {
  if (!canApply) {
    if (reason === "no-package") return 0;
    if (reason === "insufficient-package-balance" || reason === "insufficient-after-batch-order") return 1;
    if (reason === "invalid-duration") return 2;
    return 2;
  }
  return 3;
}

function encodeFailDetails(details: BatchFailureDetail[]) {
  if (details.length === 0) return "";
  const json = JSON.stringify(details.slice(0, 20));
  return Buffer.from(json, "utf8").toString("base64url");
}

function decodeFailDetails(raw: string | undefined): BatchFailureDetail[] {
  if (!raw) return [];
  try {
    const txt = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(txt) as BatchFailureDetail[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function pickRepairPackage(
  tx: {
    coursePackage: {
      findMany: typeof prisma.coursePackage.findMany;
    };
  },
  input: { studentId: string; courseId: string; at: Date; needMinutes: number; needCount: number; isGroupClass: boolean }
) {
  const { studentId, courseId, at, needMinutes, needCount, isGroupClass } = input;
  const pkgMatches = await tx.coursePackage.findMany({
    where: {
      AND: [
        coursePackageAccessibleByStudent(studentId),
        coursePackageMatchesCourse(courseId),
        { type: PackageType.HOURS },
        { status: PackageStatus.ACTIVE },
        { validFrom: { lte: at } },
        { OR: [{ validTo: null }, { validTo: { gte: at } }] },
      ],
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      note: true,
      remainingMinutes: true,
      studentId: true,
      sharedStudents: {
        where: { studentId },
        select: { id: true },
      },
    },
  });

  const pickPreferred = (
    items: Array<{
      id: string;
      note: string | null;
      remainingMinutes: number | null;
      studentId: string;
      sharedStudents: Array<{ id: string }>;
    }>,
    mode: PackageMode
  ) => {
    const matched =
      items.find((p) => p.studentId === studentId) ??
      items.find((p) => p.sharedStudents.length > 0) ??
      null;
    if (!matched) return null;
    if (matched.studentId !== studentId && matched.sharedStudents.length === 0) return null;
    return {
      ...matched,
      remainingMinutes: matched.remainingMinutes ?? 0,
      mode,
    } satisfies RepairPackageCandidate;
  };

  if (isGroupClass) {
    const minuteMatched = pkgMatches.filter(
      (p) => packageModeFromNote(p.note) === "GROUP_MINUTES" && (p.remainingMinutes ?? 0) >= Math.max(1, needMinutes)
    );
    const pickedMinutes = pickPreferred(minuteMatched, "GROUP_MINUTES");
    if (pickedMinutes) return pickedMinutes;

    const countMatched = pkgMatches.filter(
      (p) => packageModeFromNote(p.note) === "GROUP_COUNT" && (p.remainingMinutes ?? 0) >= Math.max(1, needCount)
    );
    return pickPreferred(countMatched, "GROUP_COUNT");
  }

  const hourMatched = pkgMatches.filter(
    (p) => packageModeFromNote(p.note) === "HOURS_MINUTES" && (p.remainingMinutes ?? 0) >= Math.max(1, needMinutes)
  );
  return pickPreferred(hourMatched, "HOURS_MINUTES");
}

async function loadCandidateRows(limit: number) {
  const candidates = await prisma.attendance.findMany({
    where: {
      status: { in: ["PRESENT", "LATE", "ABSENT"] },
      deductedMinutes: 0,
      deductedCount: 0,
      waiveDeduction: false,
    },
    include: {
      student: { select: { id: true, name: true } },
      package: { select: { id: true, type: true } },
      session: {
        select: {
          id: true,
          startAt: true,
          endAt: true,
          teacherId: true,
          teacher: { select: { id: true, name: true } },
          class: {
            select: {
              id: true,
              courseId: true,
              capacity: true,
              teacherId: true,
              teacher: { select: { id: true, name: true } },
              course: { select: { name: true } },
              subject: { select: { name: true } },
              level: { select: { name: true } },
              campus: { select: { name: true } },
              room: { select: { name: true } },
            },
          },
          attendances: { select: { status: true } },
          feedbacks: { select: { teacherId: true, content: true } },
        },
      },
    },
    orderBy: [{ session: { startAt: "desc" } }],
    take: limit,
  });
  return candidates.filter(isCompletedSession);
}

function computeNeedUnits(row: ReportRow) {
  return durationMinutes(row.session.startAt, row.session.endAt);
}

async function buildPreviewItem(row: ReportRow): Promise<RepairPreviewItem> {
  const isGroupClass = row.session.class.capacity !== 1;
  const needMinutes = computeNeedUnits(row);
  const needCount = isGroupClass ? 1 : 0;
  const picked =
    needMinutes > 0
      ? await pickRepairPackage(prisma, {
          studentId: row.student.id,
          courseId: row.session.class.courseId,
          at: row.session.startAt,
          needMinutes,
          needCount,
          isGroupClass,
        })
      : null;

  const needUnits = picked?.mode === "GROUP_COUNT" ? needCount : needMinutes;
  const unitLabel = picked?.mode === "GROUP_COUNT" ? "classes" : "minutes";

  if (!picked) {
    return {
      attendanceId: row.id,
      studentName: row.student.name,
      sessionAt: row.session.startAt,
      needUnits: needMinutes,
      unitLabel: "minutes",
      packageId: null,
      beforeRemaining: null,
      afterRemaining: null,
      canApply: false,
      reason: needMinutes <= 0 ? "invalid-duration" : "no-package",
      ledgerNote: buildRepairLedgerNote(row.id),
    };
  }

  return {
    attendanceId: row.id,
    studentName: row.student.name,
    sessionAt: row.session.startAt,
    needUnits,
    unitLabel,
    packageId: picked.id,
    beforeRemaining: picked.remainingMinutes,
    afterRemaining: picked.remainingMinutes - needUnits,
    canApply: picked.remainingMinutes >= needUnits,
    reason: picked.remainingMinutes >= needUnits ? null : "insufficient-package-balance",
    ledgerNote: buildRepairLedgerNote(row.id),
  };
}

function applyBatchBalanceSimulation(items: RepairPreviewItem[]) {
  const balanceMap = new Map<string, number>();
  return items.map((item) => {
    if (!item.packageId || !item.canApply || item.beforeRemaining === null || item.afterRemaining === null) return item;
    const available = balanceMap.get(item.packageId) ?? item.beforeRemaining;
    if (available < item.needUnits) {
      return {
        ...item,
        beforeRemaining: available,
        afterRemaining: available,
        canApply: false,
        reason: "insufficient-after-batch-order",
      };
    }
    const after = available - item.needUnits;
    balanceMap.set(item.packageId, after);
    return { ...item, beforeRemaining: available, afterRemaining: after };
  });
}

async function repairAttendanceDeduction(attendanceId: string) {
  const row = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      student: { select: { id: true } },
      session: {
        select: {
          id: true,
          startAt: true,
          endAt: true,
          class: {
            select: {
              capacity: true,
              courseId: true,
            },
          },
        },
      },
    },
  });

  if (!row) throw new Error("Attendance not found");
  if (!DEDUCT_STATUSES.has(row.status)) throw new Error("Attendance status not deductible");

  const isGroupClass = row.session.class.capacity !== 1;
  const needMinutes = durationMinutes(row.session.startAt, row.session.endAt);
  const needCount = isGroupClass ? 1 : 0;
  if (needMinutes <= 0) throw new Error("invalid-duration");

  let fixedPackageId = "";
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${attendanceId}))`;
    const current = await tx.attendance.findUnique({
      where: { id: attendanceId },
      select: {
        id: true,
        studentId: true,
        status: true,
        deductedMinutes: true,
        deductedCount: true,
      },
    });
    if (!current) throw new Error("Attendance not found");
    if (!DEDUCT_STATUSES.has(current.status)) throw new Error("Attendance status not deductible");
    if ((current.deductedMinutes ?? 0) > 0 || (current.deductedCount ?? 0) > 0) throw new Error("Attendance already deducted");

    const picked = await pickRepairPackage(tx, {
      studentId: current.studentId,
      courseId: row.session.class.courseId,
      at: row.session.startAt,
      needMinutes,
      needCount,
      isGroupClass,
    });
    if (!picked) throw new Error("No active package available for auto deduction");

    const needUnits = picked.mode === "GROUP_COUNT" ? needCount : needMinutes;
    fixedPackageId = picked.id;
    await tx.coursePackage.update({
      where: { id: picked.id },
      data: { remainingMinutes: { decrement: needUnits } },
    });
    await tx.packageTxn.create({
      data: {
        packageId: picked.id,
        kind: "DEDUCT",
        deltaMinutes: -needUnits,
        sessionId: row.session.id,
        note: buildRepairLedgerNote(attendanceId),
      },
    });
    await tx.attendance.update({
      where: { id: attendanceId },
      data: {
        packageId: picked.id,
        deductedMinutes: picked.mode === "GROUP_COUNT" ? 0 : needMinutes,
        deductedCount: picked.mode === "GROUP_COUNT" ? needCount : 0,
        waiveDeduction: false,
        waiveReason: null,
      },
    });
  });

  return {
    attendanceId,
    studentId: row.student.id,
    sessionId: row.session.id,
    packageId: fixedPackageId,
  };
}

async function autoFixDeductAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const attendanceId = String(formData.get("attendanceId") ?? "").trim();
  if (!attendanceId) redirect("/admin/reports/undeducted-completed?err=missing-id");

  let fixedPackageId = "";
  let fixedStudentId = "";
  let fixedSessionId = "";

  try {
    const fixed = await repairAttendanceDeduction(attendanceId);
    fixedPackageId = fixed.packageId;
    fixedStudentId = fixed.studentId;
    fixedSessionId = fixed.sessionId;
  } catch (e: any) {
    const msg = encodeURIComponent(String(e?.message ?? "auto-fix-failed"));
    redirect(`/admin/reports/undeducted-completed?err=${msg}`);
  }

  await logAudit({
    actor: admin,
    module: "ATTENDANCE",
    action: "REPAIR_AUTO_DEDUCT",
    entityType: "Attendance",
    entityId: attendanceId,
    meta: { attendanceId, studentId: fixedStudentId, sessionId: fixedSessionId },
  });
  revalidatePath("/admin/reports/undeducted-completed");
  if (fixedPackageId) {
    revalidatePath(`/admin/packages/${fixedPackageId}/ledger`);
    redirect(`/admin/packages/${fixedPackageId}/ledger?msg=${encodeURIComponent("Auto deduction fixed")}`);
  }
  redirect("/admin/reports/undeducted-completed?msg=auto-fixed");
}

async function batchAutoFixDeductAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const attendanceIds = Array.from(
    new Set(
      formData
        .getAll("attendanceIds")
        .map((x) => String(x).trim())
        .filter(Boolean)
    )
  );
  const limit = Math.max(50, Math.min(2000, Number(formData.get("limit") ?? 200) || 200));
  const confirmAt = Number(formData.get("confirmAt") ?? 0);
  const cooldownMs = 5000;
  if (!Number.isFinite(confirmAt) || confirmAt <= 0) {
    redirect(`/admin/reports/undeducted-completed?limit=${limit}&err=missing-confirm-step`);
  }
  if (Date.now() - confirmAt < cooldownMs) {
    redirect(`/admin/reports/undeducted-completed?limit=${limit}&err=cooldown-not-finished`);
  }
  if (attendanceIds.length === 0) redirect(`/admin/reports/undeducted-completed?limit=${limit}&err=no-selected-rows`);

  const batchId = crypto.randomUUID();
  let ok = 0;
  let fail = 0;
  const touchedPackages = new Set<string>();
  const failDetails: BatchFailureDetail[] = [];
  const infoRows = await prisma.attendance.findMany({
    where: { id: { in: attendanceIds } },
    select: {
      id: true,
      student: { select: { name: true } },
      session: { select: { startAt: true } },
    },
  });
  const infoMap = new Map(
    infoRows.map((x) => [x.id, { studentName: x.student.name, sessionAt: x.session.startAt.toISOString() }])
  );

  for (const attendanceId of attendanceIds) {
    try {
      const fixed = await repairAttendanceDeduction(attendanceId);
      ok += 1;
      if (fixed.packageId) touchedPackages.add(fixed.packageId);
      await logAudit({
        actor: admin,
        module: "ATTENDANCE",
        action: "REPAIR_AUTO_DEDUCT_BATCH",
        entityType: "Attendance",
        entityId: attendanceId,
        meta: { attendanceId, studentId: fixed.studentId, sessionId: fixed.sessionId, batchId },
      });
    } catch (e: any) {
      fail += 1;
      const info = infoMap.get(attendanceId);
      failDetails.push({
        attendanceId,
        studentName: info?.studentName ?? "-",
        sessionAt: info?.sessionAt ?? "",
        reason: String(e?.message ?? "unknown"),
      });
    }
  }

  revalidatePath("/admin/reports/undeducted-completed");
  for (const packageId of touchedPackages) {
    revalidatePath(`/admin/packages/${packageId}/ledger`);
  }

  const failDetailParam = encodeURIComponent(encodeFailDetails(failDetails));
  redirect(
    `/admin/reports/undeducted-completed?limit=${limit}&msg=batch-fixed&ok=${ok}&fail=${fail}&batchId=${encodeURIComponent(batchId)}&failDetail=${failDetailParam}`
  );
}

async function markWaiveAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const attendanceId = String(formData.get("attendanceId") ?? "").trim();
  const waiveReason = String(formData.get("waiveReason") ?? "").trim();
  if (!attendanceId) redirect("/admin/reports/undeducted-completed?err=missing-id");
  if (!waiveReason) redirect("/admin/reports/undeducted-completed?err=missing-waive-reason");

  const current = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: { id: true, deductedMinutes: true, deductedCount: true, sessionId: true, studentId: true },
  });
  if (!current) redirect("/admin/reports/undeducted-completed?err=not-found");
  if ((current.deductedMinutes ?? 0) > 0 || (current.deductedCount ?? 0) > 0) {
    redirect("/admin/reports/undeducted-completed?err=already-deducted");
  }

  await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      waiveDeduction: true,
      waiveReason,
      packageId: null,
      deductedMinutes: 0,
      deductedCount: 0,
    },
  });

  await logAudit({
    actor: admin,
    module: "ATTENDANCE",
    action: "WAIVE_DEDUCTION",
    entityType: "Attendance",
    entityId: attendanceId,
    meta: { attendanceId, studentId: current.studentId, sessionId: current.sessionId, waiveReason },
  });
  revalidatePath("/admin/reports/undeducted-completed");
  redirect("/admin/reports/undeducted-completed?msg=waived");
}

export default async function UndeductedCompletedReportPage({
  searchParams,
}: {
  searchParams?: Promise<{
    msg?: string;
    err?: string;
    limit?: string;
    preview?: string;
    batch?: string;
    ids?: string | string[];
    ok?: string;
    fail?: string;
    batchId?: string;
    failDetail?: string;
    confirmAt?: string;
  }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const limitRaw = Number(sp?.limit ?? 200);
  const limit = Number.isFinite(limitRaw) ? Math.max(50, Math.min(2000, Math.floor(limitRaw))) : 200;
  const previewAttendanceId = String(sp?.preview ?? "").trim() || null;
  const selectedIds = parseSearchMulti(sp?.ids);
  const selectedSet = new Set(selectedIds);
  const isBatchPreview = String(sp?.batch ?? "") === "1";
  const nowMs = Date.now();
  const cooldownMs = 5000;
  const confirmAt = Number(sp?.confirmAt ?? 0);
  const hasConfirmAt = Number.isFinite(confirmAt) && confirmAt > 0;
  const remainMs = hasConfirmAt ? Math.max(0, cooldownMs - (nowMs - confirmAt)) : cooldownMs;
  const failDetails = decodeFailDetails(sp?.failDetail);

  const rows = await loadCandidateRows(limit);
  const previewRow = previewAttendanceId ? rows.find((r) => r.id === previewAttendanceId) ?? null : null;
  const previewItem = previewRow ? await buildPreviewItem(previewRow) : null;

  const batchRows = isBatchPreview ? rows.filter((r) => selectedSet.has(r.id)) : [];
  const batchPreviewRaw = await Promise.all(batchRows.map((r) => buildPreviewItem(r)));
  const batchPreviewItems = applyBatchBalanceSimulation(batchPreviewRaw).sort((a, b) => {
    const r = riskRank(a.reason, a.canApply) - riskRank(b.reason, b.canApply);
    if (r !== 0) return r;
    return new Date(b.sessionAt).getTime() - new Date(a.sessionAt).getTime();
  });
  const batchReadyItems = batchPreviewItems.filter((x) => x.canApply);
  const batchBlockedItems = batchPreviewItems.filter((x) => !x.canApply);
  const batchNeedTotal = batchReadyItems.reduce((sum, x) => sum + x.needUnits, 0);
  const selectedQuery = selectedIds.map((id) => `ids=${encodeURIComponent(id)}`).join("&");
  const confirmStepUrl = `/admin/reports/undeducted-completed?limit=${limit}&batch=1&confirmAt=${nowMs}${selectedQuery ? `&${selectedQuery}` : ""}`;
  const confirmRefreshUrl = `/admin/reports/undeducted-completed?limit=${limit}&batch=1&confirmAt=${confirmAt}${selectedQuery ? `&${selectedQuery}` : ""}`;

  return (
    <div>
      <h2>{t(lang, "Completed But Undeducted", "已完成但未减扣")}</h2>
      <div style={{ marginBottom: 12, color: "#64748b" }}>
        {t(lang, "Count", "数量")}: <b>{rows.length}</b>
      </div>
      {sp?.msg === "auto-fixed" ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Auto fix applied.", "已自动补扣。")}</div> : null}
      {sp?.msg === "waived" ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Waive marked.", "已标记免扣。")}</div> : null}
      {sp?.msg === "batch-fixed" ? (
        <div style={{ marginBottom: 12, color: "#166534" }}>
          {t(lang, "Batch auto-fix done.", "批量自动补扣完成。")} OK={Number(sp?.ok ?? 0)} / FAIL={Number(sp?.fail ?? 0)} | batchId=
          <code>{sp?.batchId ?? "-"}</code>
        </div>
      ) : null}
      {sp?.msg === "batch-fixed" && failDetails.length > 0 ? (
        <div style={{ marginBottom: 12, border: "1px solid #fecaca", background: "#fff1f2", borderRadius: 8, padding: 10 }}>
          <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: 6 }}>
            {t(lang, "Batch failures", "批量失败明细")} ({failDetails.length})
          </div>
          <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#ffe4e6" }}>
                <th align="left">{t(lang, "Student", "学生")}</th>
                <th align="left">{t(lang, "Session", "课次")}</th>
                <th align="left">{t(lang, "Reason", "原因")}</th>
              </tr>
            </thead>
            <tbody>
              {failDetails.map((f) => (
                <tr key={f.attendanceId} style={{ borderTop: "1px solid #fecdd3" }}>
                  <td>{f.studentName}</td>
                  <td>{f.sessionAt ? new Date(f.sessionAt).toLocaleString() : "-"}</td>
                  <td>{previewReasonLabel(lang, f.reason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 12, color: "#881337", marginTop: 6 }}>
            {t(
              lang,
              "Only first 20 failures are shown in this response.",
              "本次响应最多展示前 20 条失败明细。"
            )}
          </div>
        </div>
      ) : null}
      {sp?.err ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Error", "错误")}: {sp.err}</div> : null}

      <form method="GET" style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          {t(lang, "Limit", "数量上限")}:
          <input name="limit" type="number" min={50} max={2000} defaultValue={String(limit)} style={{ marginLeft: 6, width: 90 }} />
        </label>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
      </form>

      {previewItem ? (
        <div style={{ marginBottom: 12, border: "1px solid #f59e0b", borderRadius: 8, background: "#fffbeb", padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Auto Deduct Preview", "自动补扣预览")}</div>
          <div style={{ marginBottom: 4 }}>
            {t(lang, "Student", "学生")}: <b>{previewItem.studentName}</b> | {t(lang, "Session", "课次")}: {new Date(previewItem.sessionAt).toLocaleString()}
          </div>
          <div style={{ marginBottom: 8 }}>
            {t(lang, "Units", "扣减单位")}: <b>{previewItem.needUnits} {previewItem.unitLabel === "classes" ? t(lang, "class(es)", "次") : t(lang, "min", "分钟")}</b> | {t(lang, "Target Package", "目标课包")}: <b>{previewItem.packageId ?? "-"}</b>
          </div>
          <div style={{ marginBottom: 8, color: "#334155" }}>
            {t(lang, "Balance", "余额")}: <b>{previewItem.beforeRemaining ?? "-"} {"->"} {previewItem.afterRemaining ?? "-"}</b> | {t(lang, "Ledger Note", "流水备注")}: <code>{previewItem.ledgerNote}</code>
          </div>
          {previewItem.canApply ? (
            <form action={autoFixDeductAction} style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input type="hidden" name="attendanceId" value={previewItem.attendanceId} />
              <button type="submit">{t(lang, "Confirm Auto Deduct", "确认自动补扣")}</button>
              <a href={`/admin/reports/undeducted-completed?limit=${limit}`}>{t(lang, "Cancel", "取消")}</a>
            </form>
          ) : (
            <div style={{ color: "#b91c1c" }}>
              {t(lang, "No eligible package found for this row.", "该记录没有可用课包。")} ({previewReasonLabel(lang, previewItem.reason)})
            </div>
          )}
        </div>
      ) : null}

      {isBatchPreview ? (
        <div style={{ marginBottom: 12, border: "1px solid #7c3aed", borderRadius: 8, background: "#f5f3ff", padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Batch Auto Deduct Preview", "批量自动补扣预览")}</div>
          <div style={{ marginBottom: 6, color: "#1e293b" }}>
            {t(lang, "Selected", "已选")}: <b>{batchPreviewItems.length}</b> | {t(lang, "Ready", "可执行")}: <b>{batchReadyItems.length}</b> | {t(lang, "Blocked", "阻塞")}: <b>{batchBlockedItems.length}</b> | {t(lang, "Total Units", "总扣减")}: <b>{batchNeedTotal}</b>
          </div>
          {batchPreviewItems.length > 0 ? (
            <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
              <thead>
                <tr style={{ background: "#ede9fe" }}>
                  <th align="left">{t(lang, "Student", "学生")}</th>
                  <th align="left">{t(lang, "Session", "课次")}</th>
                  <th align="left">{t(lang, "Units", "扣减单位")}</th>
                  <th align="left">{t(lang, "Package", "课包")}</th>
                  <th align="left">{t(lang, "Balance", "余额")}</th>
                  <th align="left">{t(lang, "Status", "状态")}</th>
                </tr>
              </thead>
              <tbody>
                {batchPreviewItems.map((item) => (
                  <tr key={item.attendanceId} style={{ borderTop: "1px solid #ddd6fe" }}>
                    <td>{item.studentName}</td>
                    <td>{new Date(item.sessionAt).toLocaleString()}</td>
                    <td>{item.needUnits} {item.unitLabel === "classes" ? t(lang, "class(es)", "次") : t(lang, "min", "分钟")}</td>
                    <td>{item.packageId ?? "-"}</td>
                    <td>{item.beforeRemaining ?? "-"} {"->"} {item.afterRemaining ?? "-"}</td>
                    <td style={{ color: item.canApply ? "#166534" : "#b91c1c" }}>
                      {item.canApply ? t(lang, "READY", "可执行") : previewReasonLabel(lang, item.reason)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {batchReadyItems.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, color: "#334155" }}>
                {t(lang, "Summary", "摘要")}: {t(lang, "Rows", "条数")}={batchReadyItems.length} |{" "}
                {t(lang, "Total Units", "总扣减")}={batchNeedTotal} | {t(lang, "Packages", "涉及课包")}=
                {new Set(batchReadyItems.map((x) => x.packageId).filter(Boolean)).size}
              </div>
              {!hasConfirmAt ? (
                <a href={confirmStepUrl}>{t(lang, "Enter second confirmation", "进入二次确认")}</a>
              ) : remainMs > 0 ? (
                <div style={{ color: "#92400e", fontSize: 12 }}>
                  {t(lang, "Cooling down", "冷却中")}: {Math.ceil(remainMs / 1000)}s.{" "}
                  <a href={confirmRefreshUrl}>{t(lang, "Refresh", "刷新")}</a>
                </div>
              ) : (
                <form action={batchAutoFixDeductAction} style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {batchReadyItems.map((x) => (
                    <input key={x.attendanceId} type="hidden" name="attendanceIds" value={x.attendanceId} />
                  ))}
                  <input type="hidden" name="limit" value={String(limit)} />
                  <input type="hidden" name="confirmAt" value={String(confirmAt)} />
                  <button type="submit">{t(lang, "Confirm Batch Auto Deduct", "确认批量自动补扣")} ({batchReadyItems.length})</button>
                  <a href={`/admin/reports/undeducted-completed?limit=${limit}`}>{t(lang, "Cancel", "取消")}</a>
                </form>
              )}
            </div>
          ) : (
            <div style={{ color: "#b91c1c" }}>{t(lang, "No rows are ready to apply in this batch.", "本次批量预览无可执行记录。")}</div>
          )}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No anomaly rows.", "暂无异常记录。")}</div>
      ) : (
        <div>
          <form id="batchPreviewForm" method="GET">
            <input type="hidden" name="limit" value={String(limit)} />
          </form>
          <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" name="batch" value="1" form="batchPreviewForm">
              {t(lang, "Preview Selected", "预览已选")}
            </button>
            <a href={`/admin/reports/undeducted-completed?limit=${limit}`}>{t(lang, "Clear Selection", "清空选择")}</a>
          </div>
          <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th align="left">{t(lang, "Pick", "勾选")}</th>
                <th align="left">{t(lang, "Session Time", "课次时间")}</th>
                <th align="left">{t(lang, "Student", "学生")}</th>
                <th align="left">{t(lang, "Teacher", "老师")}</th>
                <th align="left">{t(lang, "Course", "课程")}</th>
                <th align="left">{t(lang, "Campus/Room", "校区/教室")}</th>
                <th align="left">{t(lang, "Status", "状态")}</th>
                <th align="left">{t(lang, "Deduct", "减扣")}</th>
                <th align="left">{t(lang, "Fix", "修复")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>
                    <input type="checkbox" name="ids" value={r.id} defaultChecked={selectedSet.has(r.id)} form="batchPreviewForm" />
                  </td>
                  <td>{new Date(r.session.startAt).toLocaleString()}</td>
                  <td>
                    {r.student.name}
                    <div style={{ color: "#94a3b8", fontSize: 11 }}>{r.student.id}</div>
                  </td>
                  <td>{r.session.teacher?.name ?? r.session.class.teacher.name}</td>
                  <td>{r.session.class.course.name} / {r.session.class.subject?.name ?? "-"} / {r.session.class.level?.name ?? "-"}</td>
                  <td>{r.session.class.campus.name} / {r.session.class.room?.name ?? "(none)"}</td>
                  <td>{r.status}</td>
                  <td style={{ color: "#b91c1c", fontWeight: 700 }}>{r.deductedCount} / {r.deductedMinutes}</td>
                  <td>
                    <div style={{ display: "grid", gap: 6, alignItems: "start" }}>
                      <a href={`/admin/reports/undeducted-completed?limit=${limit}&preview=${encodeURIComponent(r.id)}`}>{t(lang, "Preview Auto Fix", "预览自动补扣")}</a>
                      <form action={markWaiveAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <input type="hidden" name="attendanceId" value={r.id} />
                        <input name="waiveReason" required placeholder={t(lang, "Waive reason", "免扣原因")} style={{ width: 180 }} />
                        <button type="submit">{t(lang, "Mark Waive", "标记免扣")}</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
