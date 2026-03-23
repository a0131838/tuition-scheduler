import fs from "node:fs";
import path from "node:path";
import { AttendanceStatus, PrismaClient } from "@prisma/client";
import { packageModeFromNote } from "@/lib/package-mode";
import { LEDGER_INTEGRITY_ALERT_KEY } from "@/lib/ledger-integrity-alert";

const prisma = new PrismaClient();

function timestampKey(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function toSgt(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(",", "");
}

function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replace(/"/g, "\"\"")}"`;
  return s;
}

function writeCsv(filePath: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    fs.writeFileSync(filePath, "type\n", "utf8");
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  type DetailRow = {
    type: "LEDGER_SESSION_PACKAGE_MISMATCH" | "ATTENDANCE_DEDUCT_WITHOUT_PACKAGE";
    reasonCode: string;
    rootCauseCN: string;
    rootCauseEN: string;
    suggestedActionCN: string;
    suggestedActionEN: string;
    studentName: string;
    attendanceId: string;
    attendanceStatus: string;
    deductedMinutes: number | "";
    deductedCount: number | "";
    packageCourse: string;
    packageId: string;
    packageStatus: string;
    packageRemainingMinutes: number | "";
    sessionId: string;
    sessionExists: "YES" | "NO";
    sessionStartSGT: string;
    sessionEndSGT: string;
    teacherName: string;
    classCourse: string;
    expectedNet: number | "";
    actualNet: number | "";
    diffMinutes: number | "";
    updatedAtSGT: string;
  };

  const noPackageDeduct = await prisma.attendance.findMany({
    where: {
      packageId: null,
      OR: [{ deductedMinutes: { gt: 0 } }, { deductedCount: { gt: 0 } }],
    },
    select: {
      id: true,
      sessionId: true,
      studentId: true,
      status: true,
      deductedMinutes: true,
      deductedCount: true,
      updatedAt: true,
      student: { select: { name: true } },
      session: {
        select: {
          id: true,
          startAt: true,
          endAt: true,
          class: {
            select: {
              course: { select: { name: true } },
              teacher: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const txns = await prisma.packageTxn.findMany({
    where: { sessionId: { not: null } },
    select: { sessionId: true, packageId: true, deltaMinutes: true },
  });
  const attendanceWithPackage = await prisma.attendance.findMany({
    where: { packageId: { not: null } },
    select: {
      sessionId: true,
      packageId: true,
      deductedMinutes: true,
      deductedCount: true,
      status: true,
      excusedCharge: true,
      waiveDeduction: true,
      package: { select: { note: true } },
    },
  });

  const txMap = new Map<string, number>();
  for (const t of txns) {
    if (!t.sessionId) continue;
    const k = `${t.sessionId}|${t.packageId}`;
    txMap.set(k, (txMap.get(k) ?? 0) + t.deltaMinutes);
  }

  const attMap = new Map<string, number>();
  for (const a of attendanceWithPackage) {
    if (!a.packageId) continue;
    if (a.waiveDeduction) continue;
    const isDeductable =
      a.status === AttendanceStatus.EXCUSED ? Boolean(a.excusedCharge) : a.status !== AttendanceStatus.UNMARKED;
    if (!isDeductable) continue;
    const mode = packageModeFromNote(a.package?.note);
    const units = mode === "GROUP_COUNT" ? Math.max(0, a.deductedCount ?? 0) : Math.max(0, a.deductedMinutes ?? 0);
    if (units <= 0) continue;
    const k = `${a.sessionId}|${a.packageId}`;
    attMap.set(k, (attMap.get(k) ?? 0) + units);
  }

  const allKeys = new Set([...txMap.keys(), ...attMap.keys()]);
  const rawMismatches: Array<{ sessionId: string; packageId: string; expectedNet: number; actualNet: number; diff: number }> = [];
  for (const key of allKeys) {
    const actualNet = txMap.get(key) ?? 0;
    const expectedNet = -(attMap.get(key) ?? 0);
    if (actualNet === expectedNet) continue;
    const [sessionId, packageId] = key.split("|");
    rawMismatches.push({ sessionId, packageId, expectedNet, actualNet, diff: actualNet - expectedNet });
  }
  rawMismatches.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const mismatchDetails = await Promise.all<DetailRow>(
    rawMismatches.map(async (x) => {
      const [session, pkg] = await Promise.all([
        prisma.session.findUnique({
          where: { id: x.sessionId },
          select: {
            id: true,
            startAt: true,
            endAt: true,
            class: {
              select: {
                course: { select: { name: true } },
                teacher: { select: { name: true } },
              },
            },
          },
        }),
        prisma.coursePackage.findUnique({
          where: { id: x.packageId },
          select: {
            id: true,
            status: true,
            remainingMinutes: true,
            student: { select: { name: true } },
            course: { select: { name: true } },
          },
        }),
      ]);
      const sessionExists = session ? "YES" : "NO";
      const reasonCode =
        !session && x.expectedNet === 0 && x.actualNet < 0
          ? "ORPHAN_DEDUCT_TXN_WITHOUT_SESSION"
          : "LEDGER_NET_MISMATCH";
      const rootCauseCN =
        reasonCode === "ORPHAN_DEDUCT_TXN_WITHOUT_SESSION"
          ? "历史误扣：存在DEDUCT流水，但对应课次(Session)不存在，无法匹配到有效出勤扣减。"
          : "账本净额不一致：课次+课包维度的出勤扣减与流水净额不匹配。";
      const rootCauseEN =
        reasonCode === "ORPHAN_DEDUCT_TXN_WITHOUT_SESSION"
          ? "Historical wrong deduction: DEDUCT txn exists but linked Session is missing, so it cannot reconcile to valid attendance deduction."
          : "Ledger net mismatch: attendance deductions and package txn net do not match for the same session+package key.";
      const suggestedActionCN =
        reasonCode === "ORPHAN_DEDUCT_TXN_WITHOUT_SESSION"
          ? "对不存在课次的误扣新增反向冲正流水（ROLLBACK/ADJUST），并保留审计备注。"
          : "逐条核对Attendance与PackageTxn，按差值补记或冲正流水，直至净额一致。";
      const suggestedActionEN =
        reasonCode === "ORPHAN_DEDUCT_TXN_WITHOUT_SESSION"
          ? "Insert offset reversal txn (ROLLBACK/ADJUST) for orphan deduction and keep an audit note."
          : "Reconcile Attendance and PackageTxn row-by-row and post missing/reversal txns until net matches.";
      return {
        type: "LEDGER_SESSION_PACKAGE_MISMATCH",
        reasonCode,
        rootCauseCN,
        rootCauseEN,
        suggestedActionCN,
        suggestedActionEN,
        studentName: pkg?.student?.name ?? "",
        attendanceId: "",
        attendanceStatus: "",
        deductedMinutes: "",
        deductedCount: "",
        packageCourse: pkg?.course?.name ?? "",
        packageId: x.packageId,
        packageStatus: pkg?.status ?? "",
        packageRemainingMinutes: pkg?.remainingMinutes ?? "",
        sessionId: x.sessionId,
        sessionExists,
        sessionStartSGT: session?.startAt ? toSgt(session.startAt) : "",
        sessionEndSGT: session?.endAt ? toSgt(session.endAt) : "",
        teacherName: session?.class?.teacher?.name ?? "",
        classCourse: session?.class?.course?.name ?? "",
        expectedNet: x.expectedNet,
        actualNet: x.actualNet,
        diffMinutes: x.diff,
        updatedAtSGT: "",
      };
    })
  );

  const noPackageRows: DetailRow[] = noPackageDeduct.map((x) => ({
    type: "ATTENDANCE_DEDUCT_WITHOUT_PACKAGE",
    reasonCode: "ATTENDANCE_DEDUCTED_BUT_PACKAGE_NOT_BOUND",
    rootCauseCN: "出勤已发生扣减（分钟/次数>0），但未绑定课包(packageId为空)，导致扣减去向不明。",
    rootCauseEN: "Attendance has deduction units (>0) but no package binding (packageId is null), so deduction destination is undefined.",
    suggestedActionCN: "若确认已上课：补绑定正确课包并补记DEDUCT流水；若确认未上课：按规则标记免扣并保留原因。",
    suggestedActionEN: "If class was delivered: backfill correct package binding and add DEDUCT txn; if not delivered: waive deduction with audit reason.",
    studentName: x.student.name,
    attendanceId: x.id,
    attendanceStatus: x.status,
    deductedMinutes: x.deductedMinutes,
    deductedCount: x.deductedCount,
    packageCourse: "",
    packageId: "",
    packageStatus: "",
    packageRemainingMinutes: "",
    sessionId: x.sessionId,
    sessionExists: x.session ? "YES" : "NO",
    sessionStartSGT: x.session?.startAt ? toSgt(x.session.startAt) : "",
    sessionEndSGT: x.session?.endAt ? toSgt(x.session.endAt) : "",
    teacherName: x.session?.class?.teacher?.name ?? "",
    classCourse: x.session?.class?.course?.name ?? "",
    expectedNet: "",
    actualNet: "",
    diffMinutes: "",
    updatedAtSGT: toSgt(x.updatedAt),
  }));

  const detailRows = [...mismatchDetails, ...noPackageRows];
  const summaryRows = [
    { type: "LEDGER_SESSION_PACKAGE_MISMATCH", count: mismatchDetails.length },
    { type: "ATTENDANCE_DEDUCT_WITHOUT_PACKAGE", count: noPackageRows.length },
    { type: "TOTAL", count: mismatchDetails.length + noPackageRows.length },
  ];

  const outDir = path.join(process.cwd(), "ops", "reports", "reconciliation");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = timestampKey();
  const detailPath = path.join(outDir, `daily-ledger-integrity-detail-${stamp}.csv`);
  const summaryPath = path.join(outDir, `daily-ledger-integrity-summary-${stamp}.csv`);
  writeCsv(detailPath, detailRows);
  writeCsv(summaryPath, summaryRows);

  const payload = {
    generatedAt: new Date().toISOString(),
    mismatchCount: mismatchDetails.length,
    noPackageDeductCount: noPackageRows.length,
    totalIssueCount: detailRows.length,
    detailPath,
    summaryPath,
  };

  await prisma.appSetting.upsert({
    where: { key: LEDGER_INTEGRITY_ALERT_KEY },
    create: { key: LEDGER_INTEGRITY_ALERT_KEY, value: JSON.stringify(payload) },
    update: { value: JSON.stringify(payload) },
  });

  console.log(JSON.stringify(payload, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
