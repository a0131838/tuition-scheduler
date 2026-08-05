import type { CoursePackage, Course, PackageStatus, PackageType } from "@prisma/client";
import { formatBusinessDateOnly } from "@/lib/date-only";
import { listParentBillingForPackage } from "@/lib/student-parent-billing";

type PackageWithCourse = Pick<
  CoursePackage,
  | "id"
  | "type"
  | "status"
  | "totalMinutes"
  | "remainingMinutes"
  | "validFrom"
  | "validTo"
  | "paid"
  | "paidAt"
  | "paidAmount"
  | "note"
> & {
  course: Pick<Course, "id" | "name">;
};

function moneyFromCents(cents: number | null | undefined) {
  if (cents == null) return null;
  return Math.round(Number(cents || 0)) / 100;
}

function hoursFromMinutes(minutes: number | null | undefined) {
  if (minutes == null) return null;
  return Math.round((minutes / 60) * 100) / 100;
}

export function miniappPackageDto(pkg: PackageWithCourse) {
  const totalMinutes = pkg.totalMinutes ?? null;
  const remainingMinutes = pkg.remainingMinutes ?? null;
  const usedMinutes = totalMinutes == null || remainingMinutes == null ? null : Math.max(0, totalMinutes - remainingMinutes);

  return {
    id: pkg.id,
    courseId: pkg.course.id,
    courseName: pkg.course.name,
    type: pkg.type as PackageType,
    status: pkg.status as PackageStatus,
    statusLabel: pkg.status === "ACTIVE" ? "使用中" : pkg.status === "PAUSED" ? "已暂停" : "已到期",
    totalMinutes,
    remainingMinutes,
    usedMinutes,
    totalHours: hoursFromMinutes(totalMinutes),
    remainingHours: hoursFromMinutes(remainingMinutes),
    usedHours: hoursFromMinutes(usedMinutes),
    validFrom: formatBusinessDateOnly(pkg.validFrom),
    validTo: pkg.validTo ? formatBusinessDateOnly(pkg.validTo) : null,
    paid: pkg.paid,
    paidAt: pkg.paidAt ? formatBusinessDateOnly(pkg.paidAt) : null,
    paidAmount: moneyFromCents(pkg.paidAmount),
    note: pkg.note,
  };
}

export async function miniappBillingForPackage(pkg: PackageWithCourse) {
  const billing = await listParentBillingForPackage(pkg.id);
  const paidFromRecords = billing.paymentRecords.reduce((sum, row) => sum + Number(row.paymentAmount || 0), 0);
  const invoiceTotal = billing.invoices.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const receiptTotal = billing.receipts.reduce((sum, row) => sum + Number(row.amountReceived || 0), 0);
  const paidAmount = paidFromRecords || receiptTotal || moneyFromCents(pkg.paidAmount) || 0;
  const unpaidAmount = Math.max(0, invoiceTotal - paidAmount);

  return {
    package: miniappPackageDto(pkg),
    summary: {
      currency: "SGD",
      invoiceTotal,
      paidAmount,
      receiptTotal,
      unpaidAmount,
      hasUnpaid: unpaidAmount > 0,
      contactFinanceEnabled: true,
      note: "金额与收据状态仅供核对，如有疑问请联系财务确认。",
    },
    invoices: billing.invoices.map((row) => ({
      id: row.id,
      invoiceNo: row.invoiceNo,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      amount: row.amount,
      gstAmount: row.gstAmount,
      totalAmount: row.totalAmount,
      downloadUrl: `/api/miniapp/billing/invoices/${row.id}/pdf`,
    })),
    paymentRecords: billing.paymentRecords.map((row) => ({
      id: row.id,
      paymentDate: row.paymentDate,
      paymentMethod: row.paymentMethod,
      paymentAmount: row.paymentAmount,
      referenceNo: row.referenceNo,
      uploadedAt: row.uploadedAt,
      note: row.note,
    })),
    receipts: billing.receipts.map((row) => ({
      id: row.id,
      receiptNo: row.receiptNo,
      receiptDate: row.receiptDate,
      amountReceived: row.amountReceived,
      totalAmount: row.totalAmount,
      downloadUrl: `/api/miniapp/billing/receipts/${row.id}/pdf`,
    })),
  };
}
