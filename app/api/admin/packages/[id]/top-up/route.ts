import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return bad("Missing id", 409);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const addMinutes = Number(body?.addMinutes ?? 0);
  const note = String(body?.note ?? "").trim();
  const paid = !!body?.paid;
  const paidAtStr = String(body?.paidAt ?? "");
  const paidAmountRaw = body?.paidAmount;
  const paidNote = String(body?.paidNote ?? "");

  if (!Number.isFinite(addMinutes) || addMinutes <= 0) return bad("Invalid addMinutes", 409);

  const paidAt = paidAtStr ? new Date(paidAtStr) : paid ? new Date() : null;
  if (paidAtStr && (Number.isNaN(paidAt!.getTime()) || !paidAt)) return bad("Invalid paidAt", 409);

  let paidAmount: number | null = null;
  if (paidAmountRaw !== "" && paidAmountRaw != null) {
    const n = Number(paidAmountRaw);
    if (!Number.isFinite(n)) return bad("Invalid paidAmount", 409);
    paidAmount = n;
  }
  if (paid && !paidAtStr && paidAmount == null) {
    return bad("Paid requires paidAt or paidAmount", 409);
  }

  const pkg = await prisma.coursePackage.findUnique({
    where: { id },
    select: { id: true, type: true, remainingMinutes: true, totalMinutes: true },
  });
  if (!pkg) return bad("Package not found", 404);
  if (pkg.type !== "HOURS") return bad("Only HOURS package can top-up", 409);

  const curRemain = pkg.remainingMinutes ?? 0;
  const curTotal = pkg.totalMinutes ?? pkg.remainingMinutes ?? 0;

  await prisma.$transaction(async (tx) => {
    await tx.coursePackage.update({
      where: { id },
      data: {
        remainingMinutes: curRemain + addMinutes,
        totalMinutes: curTotal + addMinutes,
        ...(paid
          ? {
              paid: true,
              paidAt,
              paidAmount,
              paidNote: paidNote || null,
            }
          : {}),
      },
    });

    await tx.packageTxn.create({
      data: {
        packageId: id,
        kind: "PURCHASE",
        deltaMinutes: addMinutes,
        note: note ? `Top-up: ${note}` : "Top-up purchase",
      },
    });
  });

  return Response.json({ ok: true });
}

