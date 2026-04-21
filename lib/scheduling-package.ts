import { PackageStatus, PackageType, Prisma } from "@prisma/client";
import { coursePackageAccessibleByStudent, coursePackageMatchesCourse } from "@/lib/package-sharing";

type PackageQueryClient = Pick<Prisma.TransactionClient, "coursePackage">;

export type PackageSchedulingDecision =
  | {
      ok: true;
      packageId: string;
      financeGateStatus: "EXEMPT" | "SCHEDULABLE";
    }
  | {
      ok: false;
      code: "NO_ACTIVE_PACKAGE" | "PACKAGE_FINANCE_GATE_BLOCKED";
      message: string;
      packageId?: string;
      financeGateStatus?: string;
    };

function financeGateOpen(status: string | null | undefined) {
  return status === "EXEMPT" || status === "SCHEDULABLE";
}

function packageGateBlockedMessage(pkg: { financeGateStatus: string; financeGateReason: string | null }) {
  if (pkg.financeGateStatus === "BLOCKED") {
    return pkg.financeGateReason?.trim()
      ? `Invoice approval is blocked. Open package billing to fix it. ${pkg.financeGateReason.trim()}`
      : "Invoice approval is blocked. Open package billing to fix it.";
  }
  return "Invoice approval is pending. Open package billing before scheduling.";
}

export async function getSchedulablePackageDecision(
  db: PackageQueryClient,
  opts: {
    studentId: string;
    courseId: string;
    at: Date;
    requiredHoursMinutes: number;
  }
): Promise<PackageSchedulingDecision> {
  const { studentId, courseId, at, requiredHoursMinutes } = opts;
  const needMinutes = Math.max(1, Math.floor(requiredHoursMinutes));

  const candidates = await db.coursePackage.findMany({
    where: {
      AND: [
        coursePackageAccessibleByStudent(studentId),
        coursePackageMatchesCourse(courseId),
        { status: PackageStatus.ACTIVE },
        { validFrom: { lte: at } },
        { OR: [{ validTo: null }, { validTo: { gte: at } }] },
      ],
    },
    select: {
      id: true,
      type: true,
      remainingMinutes: true,
      financeGateStatus: true,
      financeGateReason: true,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  const eligible = candidates.filter((pkg) => {
    if (pkg.type === PackageType.MONTHLY) return true;
    return (pkg.remainingMinutes ?? 0) >= needMinutes;
  });

  if (!eligible.length) {
    return {
      ok: false,
      code: "NO_ACTIVE_PACKAGE",
      message: "No active package for this course",
    };
  }

  const schedulable = eligible.find((pkg) => financeGateOpen(pkg.financeGateStatus));
  if (schedulable) {
    return {
      ok: true,
      packageId: schedulable.id,
      financeGateStatus: schedulable.financeGateStatus as "EXEMPT" | "SCHEDULABLE",
    };
  }

  const blocked =
    eligible.find((pkg) => pkg.financeGateStatus === "BLOCKED") ??
    eligible.find((pkg) => pkg.financeGateStatus === "INVOICE_PENDING_MANAGER") ??
    eligible[0];
  return {
    ok: false,
    code: "PACKAGE_FINANCE_GATE_BLOCKED",
    message: packageGateBlockedMessage(blocked),
    packageId: blocked.id,
    financeGateStatus: blocked.financeGateStatus,
  };
}

export async function hasSchedulablePackage(
  db: PackageQueryClient,
  opts: {
    studentId: string;
    courseId: string;
    at: Date;
    requiredHoursMinutes: number;
  }
) {
  const decision = await getSchedulablePackageDecision(db, opts);
  return decision.ok;
}
