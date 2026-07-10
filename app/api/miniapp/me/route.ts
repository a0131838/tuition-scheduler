import { servicePlanLabel, academicRiskLabel } from "@/lib/academic-management";
import { prisma } from "@/lib/prisma";
import { ok, requireMiniappParent } from "../_lib";

export async function GET(req: Request) {
  const auth = await requireMiniappParent(req);
  if (!auth.ok) return auth.response;

  const rows = await prisma.parentStudentLink.findMany({
    where: { parentId: auth.parent.id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          school: true,
          grade: true,
          servicePlanType: true,
          academicRiskLevel: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return ok({
    parent: {
      id: auth.parent.id,
      name: auth.parent.name,
      phone: auth.parent.phone,
      phoneCountry: auth.parent.phoneCountry,
      status: auth.parent.status,
    },
    students: rows.map((row) => ({
      id: row.student.id,
      name: row.student.name,
      school: row.student.school,
      grade: row.student.grade,
      relationship: row.relationship,
      servicePlanType: row.student.servicePlanType,
      servicePlanLabel: servicePlanLabel(row.student.servicePlanType),
      academicRiskLevel: row.student.academicRiskLevel,
      academicRiskLabel: academicRiskLabel(row.student.academicRiskLevel),
      permissions: {
        canViewSchedule: row.canViewSchedule,
        canViewFeedback: row.canViewFeedback,
        canViewFinance: row.canViewFinance,
        canViewReports: row.canViewReports,
        canCreateRequests: row.canCreateRequests,
      },
    })),
  });
}
