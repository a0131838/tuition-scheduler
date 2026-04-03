import { prisma } from "@/lib/prisma";
import { listAllParentBilling } from "@/lib/student-parent-billing";
import { parseBusinessDateEnd, pad2 } from "@/lib/date-only";

type MonthParts = {
  year: number;
  month: number;
};

export type StudentPackageMonthEndBalanceRow = {
  month: string;
  monthEnd: string;
  packageId: string;
  studentName: string;
  courseName: string;
  packageStatus: string;
  totalPurchasedMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  paidAmountBasis: number;
  paidAmountBasisSource: "RECEIPTS" | "PACKAGE_PAID_AMOUNT" | "NONE";
  remainingAmount: number;
};

export function parseMonthInput(value: string | null | undefined): MonthParts | null {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function monthEndDateOnlyFromMonth(value: string | null | undefined) {
  const parsed = parseMonthInput(value);
  if (!parsed) return null;
  const lastDay = new Date(parsed.year, parsed.month, 0).getDate();
  return `${parsed.year}-${pad2(parsed.month)}-${pad2(lastDay)}`;
}

function normalizeAmount(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function minutesToHours(minutes: number) {
  return Number((Math.max(0, minutes) / 60).toFixed(2));
}

export function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}

export async function listStudentPackageMonthEndBalances(month: string) {
  const monthEnd = monthEndDateOnlyFromMonth(month);
  if (!monthEnd) {
    throw new Error("Invalid month format. Use YYYY-MM.");
  }

  const cutoff = parseBusinessDateEnd(monthEnd);
  if (!cutoff) {
    throw new Error("Invalid month end.");
  }

  const [packages, parentBilling] = await Promise.all([
    prisma.coursePackage.findMany({
      where: {
        type: "HOURS",
        createdAt: { lte: cutoff },
      },
      include: {
        student: true,
        course: true,
        txns: {
          where: { createdAt: { lte: cutoff } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ student: { name: "asc" } }, { createdAt: "asc" }],
    }),
    listAllParentBilling(),
  ]);

  const receiptBasisByPackage = new Map<string, number>();
  for (const receipt of parentBilling.receipts) {
    if (String(receipt.receiptDate ?? "") > monthEnd) continue;
    const current = receiptBasisByPackage.get(receipt.packageId) ?? 0;
    receiptBasisByPackage.set(receipt.packageId, current + normalizeAmount(receipt.amountReceived));
  }

  return packages.map<StudentPackageMonthEndBalanceRow>((pkg) => {
    let totalPurchasedMinutes = 0;
    let usedMinutes = 0;
    let remainingMinutes = 0;

    for (const txn of pkg.txns) {
      const delta = Number(txn.deltaMinutes ?? 0);
      if (delta > 0) totalPurchasedMinutes += delta;
      if (delta < 0) usedMinutes += Math.abs(delta);
      remainingMinutes += delta;
    }

    const receiptBasis = normalizeAmount(receiptBasisByPackage.get(pkg.id));
    const packagePaidBasis = normalizeAmount(pkg.paidAmount);
    const paidAmountBasis = receiptBasis > 0 ? receiptBasis : packagePaidBasis;
    const paidAmountBasisSource =
      receiptBasis > 0 ? "RECEIPTS" : packagePaidBasis > 0 ? "PACKAGE_PAID_AMOUNT" : "NONE";

    const remainingAmount =
      totalPurchasedMinutes > 0
        ? roundMoney((paidAmountBasis * Math.max(0, remainingMinutes)) / totalPurchasedMinutes)
        : 0;

    return {
      month,
      monthEnd,
      packageId: pkg.id,
      studentName: pkg.student?.name ?? "-",
      courseName: pkg.course?.name ?? "-",
      packageStatus: pkg.status,
      totalPurchasedMinutes,
      usedMinutes,
      remainingMinutes: Math.max(0, remainingMinutes),
      paidAmountBasis,
      paidAmountBasisSource,
      remainingAmount,
    };
  });
}
