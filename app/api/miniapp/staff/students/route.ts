import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { prisma } from "@/lib/prisma";
import { canUseMiniappAcademicDesk } from "@/lib/miniapp-staff-action-center";

function cleanQuery(value: string | null) {
  return String(value ?? "").trim().slice(0, 80);
}

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappAcademicDesk(auth.user)) return bad("Student operations workspace permission required", 403);

  const url = new URL(req.url);
  const q = cleanQuery(url.searchParams.get("q"));
  if (q.length < 2) return ok({ students: [] });

  const students = await prisma.student.findMany({
    where: {
      AND: [
        { OR: [
          { name: { contains: q, mode: "insensitive" } },
          { school: { contains: q, mode: "insensitive" } },
          { targetSchool: { contains: q, mode: "insensitive" } },
        ] },
      ],
    },
    select: {
      id: true,
      name: true,
      grade: true,
      school: true,
      targetSchool: true,
    },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    take: 20,
  });

  return ok({
    students: students.map((student) => ({
      id: student.id,
      name: student.name,
      grade: student.grade,
      school: student.school,
      targetSchool: student.targetSchool,
      label: [student.name, student.grade, student.school || student.targetSchool].filter(Boolean).join(" / "),
    })),
  });
}
