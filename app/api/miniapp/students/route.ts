import { academicRiskLabel, servicePlanLabel } from "@/lib/academic-management";
import { FULL_CARE_PROGRAMS } from "@/lib/full-care-pricing";
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
          nextAction: true,
          nextActionDue: true,
          careEngagements: {
            where: { status: "ACTIVE", programType: { in: ["PRE_U_ACADEMIC_CARE", "PRE_U_FULL_COORDINATION"] } },
            select: { programType: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return ok({
    students: rows.map((row) => {
      const activeCare = row.student.careEngagements[0];
      const activeCareLabel = activeCare
        ? FULL_CARE_PROGRAMS[activeCare.programType as keyof typeof FULL_CARE_PROGRAMS]?.labelZh
        : null;
      return ({
      id: row.student.id,
      name: row.student.name,
      school: row.student.school,
      grade: row.student.grade,
      relationship: row.relationship,
      servicePlanType: row.student.servicePlanType,
      servicePlanLabel: activeCareLabel ?? servicePlanLabel(row.student.servicePlanType),
      fullCareActive: Boolean(activeCare),
      academicRiskLevel: row.student.academicRiskLevel,
      academicRiskLabel: academicRiskLabel(row.student.academicRiskLevel),
      nextAction: row.student.nextAction,
      nextActionDue: row.student.nextActionDue?.toISOString() ?? null,
      });
    }),
  });
}
