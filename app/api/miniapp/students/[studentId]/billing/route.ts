import { prisma } from "@/lib/prisma";
import { miniappBillingForPackage } from "@/lib/miniapp-parent-finance";
import { ok, requireMiniappStudentAccess } from "../../../_lib";

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewFinance");
  if (!auth.ok) return auth.response;

  const packages = await prisma.coursePackage.findMany({
    where: { studentId },
    include: { course: { select: { id: true, name: true } } },
    orderBy: [{ status: "asc" }, { validFrom: "desc" }],
    take: 100,
  });

  const rows = await Promise.all(packages.map((pkg) => miniappBillingForPackage(pkg)));
  return ok({ billing: rows });
}
