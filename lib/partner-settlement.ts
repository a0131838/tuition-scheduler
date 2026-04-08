import { prisma } from "@/lib/prisma";

const ACTIVE_SETTLEMENT_STATUSES = ["PENDING", "INVOICED", "CANCELLED"] as const;

export type OnlinePartnerSettlementCandidate = {
  id: string;
  packageTxnId: string;
  packageId: string;
  packageStatus: string;
  studentId: string;
  studentName: string;
  courseName: string;
  purchaseAt: Date;
  purchasedMinutes: number;
  purchasedHours: number;
  settlementStartAt: Date;
  settlementEndAt: Date;
};

export async function listOnlinePartnerSettlementCandidates(input: {
  sourceChannelId: string;
  packageTxnIds?: string[];
}) {
  const packageTxnIds = Array.from(
    new Set((input.packageTxnIds ?? []).map((value) => String(value ?? "").trim()).filter(Boolean))
  );
  const purchaseTxns = await prisma.packageTxn.findMany({
    where: {
      kind: "PURCHASE",
      deltaMinutes: { gt: 0 },
      ...(packageTxnIds.length ? { id: { in: packageTxnIds } } : {}),
      package: {
        type: "HOURS",
        settlementMode: "ONLINE_PACKAGE_END",
        student: { sourceChannelId: input.sourceChannelId },
      },
    },
    select: {
      id: true,
      packageId: true,
      deltaMinutes: true,
      createdAt: true,
      package: {
        select: {
          id: true,
          status: true,
          student: { select: { id: true, name: true } },
          course: { select: { name: true } },
        },
      },
    },
    orderBy: [{ packageId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  if (purchaseTxns.length === 0) return [] as OnlinePartnerSettlementCandidate[];

  const packageIds = Array.from(new Set(purchaseTxns.map((txn) => txn.packageId)));
  const purchaseTxnIdSet = new Set(purchaseTxns.map((txn) => txn.id));

  const [attendanceRows, activeSettlements, legacySettlements] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        packageId: { in: packageIds },
        deductedMinutes: { gt: 0 },
      },
      select: {
        id: true,
        packageId: true,
        deductedMinutes: true,
        session: { select: { startAt: true, endAt: true } },
      },
      orderBy: [{ packageId: "asc" }, { session: { startAt: "asc" } }, { id: "asc" }],
    }),
    prisma.partnerSettlement.findMany({
      where: {
        mode: "ONLINE_PACKAGE_END",
        status: { in: [...ACTIVE_SETTLEMENT_STATUSES] },
        packageTxnId: { in: Array.from(purchaseTxnIdSet) },
      },
      select: { packageTxnId: true },
    }),
    prisma.partnerSettlement.findMany({
      where: {
        mode: "ONLINE_PACKAGE_END",
        status: { in: [...ACTIVE_SETTLEMENT_STATUSES] },
        packageId: { in: packageIds },
        packageTxnId: null,
      },
      select: { packageId: true },
    }),
  ]);

  const blockedTxnIds = new Set(
    activeSettlements
      .map((row) => String(row.packageTxnId ?? "").trim())
      .filter(Boolean)
  );
  const blockedLegacyPackageIds = new Set(
    legacySettlements
      .map((row) => String(row.packageId ?? "").trim())
      .filter(Boolean)
  );

  const txnsByPackage = new Map<string, typeof purchaseTxns>();
  for (const txn of purchaseTxns) {
    if (!txnsByPackage.has(txn.packageId)) txnsByPackage.set(txn.packageId, []);
    txnsByPackage.get(txn.packageId)!.push(txn);
  }
  const attendanceByPackage = new Map<string, typeof attendanceRows>();
  for (const row of attendanceRows) {
    const packageId = String(row.packageId ?? "").trim();
    if (!packageId) continue;
    if (!attendanceByPackage.has(packageId)) attendanceByPackage.set(packageId, []);
    attendanceByPackage.get(packageId)!.push(row);
  }

  const out: OnlinePartnerSettlementCandidate[] = [];

  for (const [packageId, txns] of txnsByPackage.entries()) {
    if (blockedLegacyPackageIds.has(packageId)) continue;

    const attendances = (attendanceByPackage.get(packageId) ?? []).slice().sort((a, b) => {
      const timeDiff = a.session.startAt.getTime() - b.session.startAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.id.localeCompare(b.id);
    });

    const tranches = txns.map((txn) => ({
      txn,
      remainingMinutes: Math.max(0, Number(txn.deltaMinutes ?? 0)),
      consumedMinutes: 0,
      settlementStartAt: null as Date | null,
      settlementEndAt: null as Date | null,
    }));

    let trancheIndex = 0;
    for (const attendance of attendances) {
      let remainingAttendanceMinutes = Math.max(0, Number(attendance.deductedMinutes ?? 0));
      while (remainingAttendanceMinutes > 0 && trancheIndex < tranches.length) {
        const tranche = tranches[trancheIndex];
        if (tranche.remainingMinutes <= 0) {
          trancheIndex += 1;
          continue;
        }
        const allocatedMinutes = Math.min(remainingAttendanceMinutes, tranche.remainingMinutes);
        if (allocatedMinutes <= 0) break;
        tranche.consumedMinutes += allocatedMinutes;
        tranche.remainingMinutes -= allocatedMinutes;
        if (!tranche.settlementStartAt) tranche.settlementStartAt = attendance.session.startAt;
        tranche.settlementEndAt = attendance.session.endAt;
        remainingAttendanceMinutes -= allocatedMinutes;
        if (tranche.remainingMinutes <= 0) trancheIndex += 1;
      }
    }

    for (const tranche of tranches) {
      const purchasedMinutes = Math.max(0, Number(tranche.txn.deltaMinutes ?? 0));
      if (purchasedMinutes <= 0) continue;
      if (tranche.remainingMinutes > 0) continue;
      if (!tranche.settlementStartAt || !tranche.settlementEndAt) continue;
      if (blockedTxnIds.has(tranche.txn.id)) continue;

      out.push({
        id: tranche.txn.id,
        packageTxnId: tranche.txn.id,
        packageId: tranche.txn.packageId,
        packageStatus: tranche.txn.package.status,
        studentId: tranche.txn.package.student?.id ?? "",
        studentName: tranche.txn.package.student?.name ?? "-",
        courseName: tranche.txn.package.course?.name ?? "-",
        purchaseAt: tranche.txn.createdAt,
        purchasedMinutes,
        purchasedHours: Number((purchasedMinutes / 60).toFixed(2)),
        settlementStartAt: tranche.settlementStartAt,
        settlementEndAt: tranche.settlementEndAt,
      });
    }
  }

  return out.sort((a, b) => {
    if (a.settlementEndAt.getTime() !== b.settlementEndAt.getTime()) {
      return a.settlementEndAt.getTime() - b.settlementEndAt.getTime();
    }
    if (a.purchaseAt.getTime() !== b.purchaseAt.getTime()) {
      return a.purchaseAt.getTime() - b.purchaseAt.getTime();
    }
    return a.packageTxnId.localeCompare(b.packageTxnId);
  });
}
