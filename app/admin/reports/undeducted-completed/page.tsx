import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { isGroupPackNote } from "@/lib/package-mode";
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
  sharedStudents: Array<{ id: string }>;
};

type ReportRow = Awaited<ReturnType<typeof loadCandidateRows>>[number];

type RepairPreviewItem = {
  attendanceId: string;
  studentName: string;
  sessionAt: Date;
  needUnits: number;
  packageId: string | null;
  beforeRemaining: number | null;
  afterRemaining: number | null;
  canApply: boolean;
  reason: string | null;
  ledgerNote: string;
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

async function pickRepairPackage(
  tx: {
    coursePackage: {
      findMany: typeof prisma.coursePackage.findMany;
    };
  },
  input: { studentId: string; courseId: string; at: Date; needUnits: number; isGroupClass: boolean }
) {
  const { studentId, courseId, at, needUnits, isGroupClass } = input;
  const pkgMatches = await tx.coursePackage.findMany({
    where: {
      ...coursePackageAccessibleByStudent(studentId),
      AND: [coursePackageMatchesCourse(courseId)],
      type: PackageType.HOURS,
      status: PackageStatus.ACTIVE,
      remainingMinutes: { gte: Math.max(1, needUnits) },
      validFrom: { lte: at },
      OR: [{ validTo: null }, { validTo: { gte: at } }],
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
  const modeMatched = pkgMatches.filter((p) => (isGroupClass ? isGroupPackNote(p.note) : !isGroupPackNote(p.note)));
  const picked =
    modeMatched.find((p) => p.studentId === studentId) ??
    modeMatched.find((p) => p.sharedStudents.length > 0) ??
    null;
  if (!picked) return null;
  if (picked.studentId !== studentId && picked.sharedStudents.length === 0) return null;
  return picked as RepairPackageCandidate;
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
  const isGroupClass = row.session.class.capacity !== 1;
  return isGroupClass ? 1 : durationMinutes(row.session.startAt, row.session.endAt);
}

async function buildPreviewItem(row: ReportRow): Promise<RepairPreviewItem> {
  const isGroupClass = row.session.class.capacity !== 1;
  const needUnits = computeNeedUnits(row);
  const picked =
    needUnits > 0
      ? await pickRepairPackage(prisma, {
          studentId: row.student.id,
          courseId: row.session.class.courseId,
          at: row.session.startAt,
          needUnits,
          isGroupClass,
        })
      : null;

  if (!picked) {
    return {
      attendanceId: row.id,
      studentName: row.student.name,
      sessionAt: row.session.startAt,
      needUnits,
      packageId: null,
      beforeRemaining: null,
      afterRemaining: null,
      canApply: false,
      reason: needUnits <= 0 ? "invalid-duration" : "no-package",
      ledgerNote: buildRepairLedgerNote(row.id),
    };
  }

  return {
    attendanceId: row.id,
    studentName: row.student.name,
    sessionAt: row.session.startAt,
    needUnits,
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
  const needUnits = isGroupClass ? 1 : durationMinutes(row.session.startAt, row.session.endAt);
  if (needUnits <= 0) throw new Error("invalid-duration");

  let fixedPackageId = "";
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${attendanceId}))`;
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
      needUnits,
      isGroupClass,
    });
    if (!picked) throw new Error("No active package available for auto deduction");

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
        deductedMinutes: isGroupClass ? 0 : needUnits,
        deductedCount: isGroupClass ? 1 : 0,
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
  if (attendanceIds.length === 0) redirect(`/admin/reports/undeducted-completed?limit=${limit}&err=no-selected-rows`);

  let ok = 0;
  let fail = 0;
  const touchedPackages = new Set<string>();

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
        meta: { attendanceId, studentId: fixed.studentId, sessionId: fixed.sessionId },
      });
    } catch {
      fail += 1;
    }
  }

  revalidatePath("/admin/reports/undeducted-completed");
  for (const packageId of touchedPackages) {
    revalidatePath(`/admin/packages/${packageId}/ledger`);
  }

  redirect(`/admin/reports/undeducted-completed?limit=${limit}&msg=batch-fixed&ok=${ok}&fail=${fail}`);
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

  const rows = await loadCandidateRows(limit);
  const previewRow = previewAttendanceId ? rows.find((r) => r.id === previewAttendanceId) ?? null : null;
  const previewItem = previewRow ? await buildPreviewItem(previewRow) : null;

  const batchRows = isBatchPreview ? rows.filter((r) => selectedSet.has(r.id)) : [];
  const batchPreviewRaw = await Promise.all(batchRows.map((r) => buildPreviewItem(r)));
  const batchPreviewItems = applyBatchBalanceSimulation(batchPreviewRaw);
  const batchReadyItems = batchPreviewItems.filter((x) => x.canApply);
  const batchBlockedItems = batchPreviewItems.filter((x) => !x.canApply);
  const batchNeedTotal = batchReadyItems.reduce((sum, x) => sum + x.needUnits, 0);

  return (
    <div>
      <h2>{t(lang, "Completed But Undeducted", "Completed But Undeducted")}</h2>
      <div style={{ marginBottom: 12, color: "#64748b" }}>
        {t(lang, "Count", "Count")}: <b>{rows.length}</b>
      </div>
      {sp?.msg === "auto-fixed" ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Auto fix applied.", "Auto fix applied.")}</div> : null}
      {sp?.msg === "waived" ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Waive marked.", "Waive marked.")}</div> : null}
      {sp?.msg === "batch-fixed" ? (
        <div style={{ marginBottom: 12, color: "#166534" }}>
          {t(lang, "Batch auto-fix done.", "Batch auto-fix done.")} OK={Number(sp?.ok ?? 0)} / FAIL={Number(sp?.fail ?? 0)}
        </div>
      ) : null}
      {sp?.err ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Error", "Error")}: {sp.err}</div> : null}

      <form method="GET" style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Limit:
          <input name="limit" type="number" min={50} max={2000} defaultValue={String(limit)} style={{ marginLeft: 6, width: 90 }} />
        </label>
        <button type="submit">{t(lang, "Apply", "Apply")}</button>
      </form>

      {previewItem ? (
        <div style={{ marginBottom: 12, border: "1px solid #f59e0b", borderRadius: 8, background: "#fffbeb", padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Auto Deduct Preview", "Auto Deduct Preview")}</div>
          <div style={{ marginBottom: 4 }}>
            {t(lang, "Student", "Student")}: <b>{previewItem.studentName}</b> | {t(lang, "Session", "Session")}: {new Date(previewItem.sessionAt).toLocaleString()}
          </div>
          <div style={{ marginBottom: 8 }}>
            {t(lang, "Units", "Units")}: <b>{previewItem.needUnits}</b> | {t(lang, "Target Package", "Target Package")}: <b>{previewItem.packageId ?? "-"}</b>
          </div>
          <div style={{ marginBottom: 8, color: "#334155" }}>
            {t(lang, "Balance", "Balance")}: <b>{previewItem.beforeRemaining ?? "-"} {"->"} {previewItem.afterRemaining ?? "-"}</b> | {t(lang, "Ledger Note", "Ledger Note")}: <code>{previewItem.ledgerNote}</code>
          </div>
          {previewItem.canApply ? (
            <form action={autoFixDeductAction} style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input type="hidden" name="attendanceId" value={previewItem.attendanceId} />
              <button type="submit">{t(lang, "Confirm Auto Deduct", "Confirm Auto Deduct")}</button>
              <a href={`/admin/reports/undeducted-completed?limit=${limit}`}>{t(lang, "Cancel", "Cancel")}</a>
            </form>
          ) : (
            <div style={{ color: "#b91c1c" }}>
              {t(lang, "No eligible package found for this row.", "No eligible package found for this row.")} ({previewItem.reason ?? "blocked"})
            </div>
          )}
        </div>
      ) : null}

      {isBatchPreview ? (
        <div style={{ marginBottom: 12, border: "1px solid #7c3aed", borderRadius: 8, background: "#f5f3ff", padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Batch Auto Deduct Preview", "Batch Auto Deduct Preview")}</div>
          <div style={{ marginBottom: 6, color: "#1e293b" }}>
            {t(lang, "Selected", "Selected")}: <b>{batchPreviewItems.length}</b> | {t(lang, "Ready", "Ready")}: <b>{batchReadyItems.length}</b> | {t(lang, "Blocked", "Blocked")}: <b>{batchBlockedItems.length}</b> | {t(lang, "Total Units", "Total Units")}: <b>{batchNeedTotal}</b>
          </div>
          {batchPreviewItems.length > 0 ? (
            <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
              <thead>
                <tr style={{ background: "#ede9fe" }}>
                  <th align="left">Student</th>
                  <th align="left">Session</th>
                  <th align="left">Units</th>
                  <th align="left">Package</th>
                  <th align="left">Balance</th>
                  <th align="left">Status</th>
                </tr>
              </thead>
              <tbody>
                {batchPreviewItems.map((item) => (
                  <tr key={item.attendanceId} style={{ borderTop: "1px solid #ddd6fe" }}>
                    <td>{item.studentName}</td>
                    <td>{new Date(item.sessionAt).toLocaleString()}</td>
                    <td>{item.needUnits}</td>
                    <td>{item.packageId ?? "-"}</td>
                    <td>{item.beforeRemaining ?? "-"} {"->"} {item.afterRemaining ?? "-"}</td>
                    <td style={{ color: item.canApply ? "#166534" : "#b91c1c" }}>{item.canApply ? "READY" : item.reason ?? "BLOCKED"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {batchReadyItems.length > 0 ? (
            <form action={batchAutoFixDeductAction} style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {batchReadyItems.map((x) => (
                <input key={x.attendanceId} type="hidden" name="attendanceIds" value={x.attendanceId} />
              ))}
              <input type="hidden" name="limit" value={String(limit)} />
              <button type="submit">{t(lang, "Confirm Batch Auto Deduct", "Confirm Batch Auto Deduct")} ({batchReadyItems.length})</button>
              <a href={`/admin/reports/undeducted-completed?limit=${limit}`}>{t(lang, "Cancel", "Cancel")}</a>
            </form>
          ) : (
            <div style={{ color: "#b91c1c" }}>{t(lang, "No rows are ready to apply in this batch.", "No rows are ready to apply in this batch.")}</div>
          )}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No anomaly rows.", "No anomaly rows.")}</div>
      ) : (
        <div>
          <form id="batchPreviewForm" method="GET">
            <input type="hidden" name="limit" value={String(limit)} />
          </form>
          <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" name="batch" value="1" form="batchPreviewForm">
              {t(lang, "Preview Selected", "Preview Selected")}
            </button>
            <a href={`/admin/reports/undeducted-completed?limit=${limit}`}>{t(lang, "Clear Selection", "Clear Selection")}</a>
          </div>
          <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th align="left">{t(lang, "Pick", "Pick")}</th>
                <th align="left">{t(lang, "Session Time", "Session Time")}</th>
                <th align="left">{t(lang, "Student", "Student")}</th>
                <th align="left">{t(lang, "Teacher", "Teacher")}</th>
                <th align="left">{t(lang, "Course", "Course")}</th>
                <th align="left">{t(lang, "Campus/Room", "Campus/Room")}</th>
                <th align="left">{t(lang, "Status", "Status")}</th>
                <th align="left">{t(lang, "Deduct", "Deduct")}</th>
                <th align="left">{t(lang, "Fix", "Fix")}</th>
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
                      <a href={`/admin/reports/undeducted-completed?limit=${limit}&preview=${encodeURIComponent(r.id)}`}>{t(lang, "Preview Auto Fix", "Preview Auto Fix")}</a>
                      <form action={markWaiveAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <input type="hidden" name="attendanceId" value={r.id} />
                        <input name="waiveReason" required placeholder={t(lang, "Waive reason", "Waive reason")} style={{ width: 180 }} />
                        <button type="submit">{t(lang, "Mark Waive", "Mark Waive")}</button>
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
