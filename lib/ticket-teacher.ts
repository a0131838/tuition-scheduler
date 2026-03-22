import { prisma } from "@/lib/prisma";

function normalizeName(raw: string | null | undefined) {
  const v = String(raw ?? "").trim();
  return v || "";
}

export async function resolveTicketTeacherId(input: {
  teacherName: string | null | undefined;
  teacherId?: string | null | undefined;
}) {
  const teacherName = normalizeName(input.teacherName);
  const teacherId = String(input.teacherId ?? "").trim();

  if (teacherId) {
    const linked = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true },
    });
    if (linked) {
      if (!teacherName) return linked.id;
      if (normalizeName(linked.name).toLowerCase() === teacherName.toLowerCase()) {
        return linked.id;
      }
    }
  }

  if (!teacherName) return null;

  const matches = await prisma.teacher.findMany({
    where: { name: { equals: teacherName, mode: "insensitive" } },
    select: { id: true },
    take: 2,
  });

  return matches.length === 1 ? matches[0].id : null;
}
