import { prisma } from "@/lib/prisma";
import { miniappBillingForPackage } from "@/lib/miniapp-parent-finance";
import { ok, requireMiniappStudentAccess } from "../../../_lib";

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewFinance");
  if (!auth.ok) return auth.response;

  const [packages, contracts] = await Promise.all([
    prisma.coursePackage.findMany({
      where: { studentId },
      include: { course: { select: { id: true, name: true } } },
      orderBy: [{ status: "asc" }, { validFrom: "desc" }],
      take: 100,
    }),
    prisma.studentContract.findMany({
      where: { studentId, status: { in: ["SIGNED", "INVOICE_CREATED"] } },
      select: { id: true, contractMode: true, flowType: true, signedAt: true, package: { select: { course: { select: { name: true } } } } },
      orderBy: { signedAt: "desc" },
      take: 30,
    }),
  ]);
  const billing = await Promise.all(packages.map((pkg) => miniappBillingForPackage(pkg)));
  const activePackages = billing.filter((row) => row.package.status === "ACTIVE");

  return ok({
    note: "金额与收据状态仅供核对，如有疑问请联系财务确认。",
    contactFinanceEnabled: true,
    summary: {
      activePackageCount: activePackages.length,
      totalRemainingMinutes: activePackages.reduce((sum, row) => sum + (row.package.remainingMinutes ?? 0), 0),
      totalRemainingHours: activePackages.reduce((sum, row) => sum + (row.package.remainingHours ?? 0), 0),
      invoiceTotal: billing.reduce((sum, row) => sum + row.summary.invoiceTotal, 0),
      paidAmount: billing.reduce((sum, row) => sum + row.summary.paidAmount, 0),
      unpaidAmount: billing.reduce((sum, row) => sum + row.summary.unpaidAmount, 0),
      invoiceCount: billing.reduce((sum, row) => sum + row.invoices.length, 0),
      receiptCount: billing.reduce((sum, row) => sum + row.receipts.length, 0),
    },
    packages: billing,
    contracts: contracts.map((contract) => ({
      id: contract.id,
      contractMode: contract.contractMode,
      contractGroup: contract.contractMode === "FULL_CARE_AGREEMENT" ? "FULL_CARE" : "TUITION",
      title: contract.contractMode === "FULL_CARE_AGREEMENT"
        ? "全程托管服务合同"
        : contract.contractMode === "SSG_STANDARD_PEI_V4"
          ? "SSG PEI-Student Contract"
          : contract.flowType === "RENEWAL" ? "课程续费合同" : "课程首购合同",
      courseName: contract.contractMode === "FULL_CARE_AGREEMENT" ? "全年课程与全程托管服务" : contract.package.course.name,
      signedAt: contract.signedAt?.toISOString() ?? null,
      downloadUrl: `/api/exports/student-contract/${contract.id}`,
    })),
  });
}
