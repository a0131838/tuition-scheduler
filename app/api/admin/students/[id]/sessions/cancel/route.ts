import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { coursePackageAccessibleByStudent } from "@/lib/package-sharing";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: studentId } = await params;
  if (!studentId) return bad("Missing studentId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const sessionId = String(body?.sessionId ?? "");
  const charge = Boolean(body?.charge);
  const note = String(body?.note ?? "").trim();

  if (!sessionId) return bad("Missing sessionId");

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, startAt: true, endAt: true, classId: true, class: { select: { courseId: true } } },
  });
  if (!session) return bad("Session not found", 404);

  const durationMin = Math.max(0, Math.round((session.endAt.getTime() - session.startAt.getTime()) / 60000));
  const desiredDeductedMinutes = charge ? durationMin : 0;

  const existing = await prisma.attendance.findUnique({
    where: { sessionId_studentId: { sessionId, studentId } },
    select: { deductedMinutes: true, packageId: true, deductedCount: true },
  });
  const prevDeductedMinutes = existing?.deductedMinutes ?? 0;
  const delta = desiredDeductedMinutes - prevDeductedMinutes;

  let packageId: string | null = existing?.packageId ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      if (delta !== 0) {
        if (!packageId && delta > 0) {
          const pkg = await tx.coursePackage.findFirst({
            where: {
              ...coursePackageAccessibleByStudent(studentId),
              courseId: session.class.courseId,
              type: "HOURS",
              status: "ACTIVE",
              remainingMinutes: { gte: delta },
              validFrom: { lte: session.startAt },
              OR: [{ validTo: null }, { validTo: { gte: session.startAt } }],
            },
            orderBy: [{ createdAt: "asc" }],
            select: { id: true },
          });
          packageId = pkg?.id ?? null;
        }

        if (!packageId) {
          throw Object.assign(new Error("No active HOURS package"), { code: "NO_ACTIVE_HOURS_PACKAGE" });
        }

        const pkg = await tx.coursePackage.findFirst({
          where: {
            id: packageId,
            ...coursePackageAccessibleByStudent(studentId),
            courseId: session.class.courseId,
            status: "ACTIVE",
            validFrom: { lte: session.startAt },
            OR: [{ validTo: null }, { validTo: { gte: session.startAt } }],
          },
          select: { id: true, type: true, remainingMinutes: true },
        });
        if (!pkg) throw Object.assign(new Error("Package not found"), { code: "PKG_NOT_FOUND" });
        if (pkg.type !== "HOURS") throw Object.assign(new Error("Package not HOURS"), { code: "PKG_NOT_HOURS" });
        if (pkg.remainingMinutes == null) {
          throw Object.assign(new Error("Package remaining minutes is null"), { code: "PKG_REMAIN_NULL" });
        }

        if (delta > 0) {
          if (pkg.remainingMinutes < delta) {
            throw Object.assign(new Error("Not enough remaining minutes"), { code: "PKG_NOT_ENOUGH" });
          }
          await tx.coursePackage.update({
            where: { id: packageId },
            data: { remainingMinutes: { decrement: delta } },
          });
          await tx.packageTxn.create({
            data: {
              packageId,
              kind: "DEDUCT",
              deltaMinutes: -delta,
              sessionId,
              note: `Cancel charge. studentId=${studentId}`,
            },
          });
        } else {
          const refund = -delta;
          await tx.coursePackage.update({
            where: { id: packageId },
            data: { remainingMinutes: { increment: refund } },
          });
          await tx.packageTxn.create({
            data: {
              packageId,
              kind: "ROLLBACK",
              deltaMinutes: refund,
              sessionId,
              note: `Cancel rollback. studentId=${studentId}`,
            },
          });
        }
      }

      await tx.attendance.upsert({
        where: { sessionId_studentId: { sessionId, studentId } },
        create: {
          sessionId,
          studentId,
          status: "EXCUSED",
          deductedCount: existing?.deductedCount ?? 0,
          deductedMinutes: desiredDeductedMinutes,
          packageId: desiredDeductedMinutes > 0 ? packageId : null,
          note: note || "Canceled",
          excusedCharge: charge,
        },
        update: {
          status: "EXCUSED",
          deductedMinutes: desiredDeductedMinutes,
          packageId: desiredDeductedMinutes > 0 ? packageId : null,
          note: note || "Canceled",
          excusedCharge: charge,
        },
      });
    });
  } catch (e: any) {
    const code = String(e?.code ?? "");
    if (code === "NO_ACTIVE_HOURS_PACKAGE") return bad("No active HOURS package", 409, { code });
    if (code === "PKG_NOT_FOUND") return bad("Package not found", 409, { code });
    if (code === "PKG_NOT_HOURS") return bad("Package not HOURS", 409, { code });
    if (code === "PKG_REMAIN_NULL") return bad("Package remaining minutes is null", 409, { code });
    if (code === "PKG_NOT_ENOUGH") return bad("Not enough remaining minutes", 409, { code });
    return bad(e?.message ?? "Cancel failed", 500);
  }

  return Response.json({ ok: true, status: "EXCUSED", excusedCharge: charge, deductedMinutes: desiredDeductedMinutes });
}
