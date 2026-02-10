import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: packageId } = await ctx.params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const units = Number(String(body?.minutes ?? "").trim());
  const note = String(body?.note ?? "").trim();
  if (!Number.isFinite(units) || units <= 0) return bad("Invalid value", 409);

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    select: { type: true, remainingMinutes: true },
  });
  if (!pkg) return bad("Package not found", 404);
  if (pkg.type !== "HOURS") return bad("Only HOURS package is supported", 409);

  const nextRemaining = (pkg.remainingMinutes ?? 0) + units;
  await prisma.$transaction([
    prisma.coursePackage.update({ where: { id: packageId }, data: { remainingMinutes: nextRemaining } }),
    prisma.packageTxn.create({
      data: {
        packageId,
        kind: "GIFT",
        deltaMinutes: units,
        note: note || null,
      },
    }),
  ]);

  return Response.json({ ok: true, remainingMinutes: nextRemaining });
}

