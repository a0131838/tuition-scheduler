import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: studentId } = await params;
  if (!studentId) return bad("Missing studentId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const name = String(body?.name ?? "").trim();
  const school = String(body?.school ?? "").trim();
  const grade = String(body?.grade ?? "").trim();
  const targetSchool = String(body?.targetSchool ?? "").trim();
  const currentMajor = String(body?.currentMajor ?? "").trim();
  const coachingContent = String(body?.coachingContent ?? "").trim();
  const note = String(body?.note ?? "").trim();
  const birthDateStr = String(body?.birthDate ?? "").trim();
  const sourceChannelId = String(body?.sourceChannelId ?? "").trim() || null;
  const studentTypeId = String(body?.studentTypeId ?? "").trim() || null;

  if (!name) return bad("Name is required", 409);

  let birthDate: Date | null = null;
  if (birthDateStr) {
    const [Y, M, D] = birthDateStr.split("-").map(Number);
    if (Number.isFinite(Y) && Number.isFinite(M) && Number.isFinite(D)) {
      birthDate = new Date(Y, M - 1, D, 0, 0, 0, 0);
    } else {
      return bad("Invalid birthDate", 409);
    }
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      name,
      school: school || null,
      grade: grade || null,
      targetSchool: targetSchool || null,
      currentMajor: currentMajor || null,
      coachingContent: coachingContent || null,
      note: note || null,
      birthDate,
      sourceChannelId,
      studentTypeId,
    },
  });

  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: studentId } = await params;
  if (!studentId) return bad("Missing studentId");

  await prisma.enrollment.deleteMany({ where: { studentId } });
  await prisma.appointment.deleteMany({ where: { studentId } });
  await prisma.attendance.deleteMany({ where: { studentId } });

  const packages = await prisma.coursePackage.findMany({
    where: { studentId },
    select: { id: true },
  });
  const packageIds = packages.map((p) => p.id);
  if (packageIds.length > 0) {
    await prisma.packageTxn.deleteMany({ where: { packageId: { in: packageIds } } });
  }
  await prisma.coursePackage.deleteMany({ where: { studentId } });

  await prisma.student.delete({ where: { id: studentId } });
  return Response.json({ ok: true });
}
