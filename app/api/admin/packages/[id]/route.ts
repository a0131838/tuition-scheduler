import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { composePackageNote, GROUP_PACK_TAG, packageModeFromNote } from "@/lib/package-mode";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseDateStart(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}
function parseDateEnd(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 23, 59, 59, 999);
}

type PackageModeKey = "HOURS_MINUTES" | "GROUP_COUNT" | "MONTHLY";

function modeKeyFromSaved(type: string, note: string | null): PackageModeKey {
  if (type === "MONTHLY") return "MONTHLY";
  return packageModeFromNote(note) === "GROUP_COUNT" ? "GROUP_COUNT" : "HOURS_MINUTES";
}

function sameModeWhere(mode: PackageModeKey) {
  if (mode === "MONTHLY") return { type: "MONTHLY" as const };
  if (mode === "GROUP_COUNT") {
    return { type: "HOURS" as const, note: { startsWith: GROUP_PACK_TAG } };
  }
  return {
    type: "HOURS" as const,
    OR: [{ note: null }, { NOT: { note: { startsWith: GROUP_PACK_TAG } } }],
  };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return bad("Missing id", 409);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const status = String(body?.status ?? "");
  const remainingMinutesRaw = body?.remainingMinutes;
  const validFromStr = String(body?.validFrom ?? "");
  const validToStr = String(body?.validTo ?? "");
  const noteRaw = String(body?.note ?? "");
  const paid = !!body?.paid;
  const paidAtStr = String(body?.paidAt ?? "");
  const paidAmountRaw = body?.paidAmount;
  const paidNote = String(body?.paidNote ?? "");

  if (!validFromStr) return bad("Missing validFrom", 409);

  const pkg = await prisma.coursePackage.findUnique({
    where: { id },
    select: { remainingMinutes: true, note: true, type: true, studentId: true, courseId: true },
  });
  if (!pkg) return bad("Package not found", 404);

  const validFrom = parseDateStart(validFromStr);
  const validTo = validToStr ? parseDateEnd(validToStr) : null;

  const paidAt = paidAtStr ? new Date(paidAtStr) : paid ? new Date() : null;
  if (paidAtStr && (Number.isNaN(paidAt!.getTime()) || !paidAt)) return bad("Invalid paidAt", 409);

  let paidAmount: number | null = null;
  if (paidAmountRaw !== "" && paidAmountRaw != null) {
    const n = Number(paidAmountRaw);
    if (Number.isFinite(n)) paidAmount = n;
    else return bad("Invalid paidAmount", 409);
  }

  let remainingMinutes: number | null = null;
  if (remainingMinutesRaw !== "" && remainingMinutesRaw != null) {
    const n = Number(remainingMinutesRaw);
    if (Number.isFinite(n) && n >= 0) remainingMinutes = n;
  }

  const note = composePackageNote(
    packageModeFromNote(pkg?.note ?? null) === "GROUP_COUNT" ? "GROUP_COUNT" : "HOURS_MINUTES",
    noteRaw
  );
  const updateMode = modeKeyFromSaved(pkg.type, note);
  const overlapCheckTo = validTo ?? new Date(2999, 0, 1);

  if (status === "ACTIVE" && updateMode === "MONTHLY") {
    const overlap = await prisma.coursePackage.findFirst({
      where: {
        id: { not: id },
        studentId: pkg.studentId,
        courseId: pkg.courseId,
        ...sameModeWhere(updateMode),
        status: "ACTIVE",
        validFrom: { lte: overlapCheckTo },
        OR: [{ validTo: null }, { validTo: { gte: validFrom } }],
      },
      select: { id: true },
    });
    if (overlap) return bad("Overlapping ACTIVE package exists for same mode", 409);
  }

  await prisma.coursePackage.update({
    where: { id },
    data: {
      status: (status as any) || undefined,
      remainingMinutes,
      validFrom,
      validTo,
      paid,
      paidAt: paid ? paidAt : null,
      paidAmount: paid ? paidAmount : null,
      paidNote: paid ? paidNote || null : null,
      note: note || null,
    },
  });

  if (pkg && remainingMinutes != null && pkg.remainingMinutes != null && remainingMinutes !== pkg.remainingMinutes) {
    const delta = remainingMinutes - pkg.remainingMinutes;
    await prisma.packageTxn.create({
      data: {
        packageId: id,
        kind: "ADJUST",
        deltaMinutes: delta,
        note: "manual adjust",
      },
    });
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return bad("Missing id", 409);

  await prisma.packageTxn.deleteMany({ where: { packageId: id } });
  await prisma.attendance.updateMany({ where: { packageId: id }, data: { packageId: null } });
  await prisma.coursePackage.delete({ where: { id } });
  return Response.json({ ok: true });
}

