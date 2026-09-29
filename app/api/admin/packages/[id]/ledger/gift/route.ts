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
  if (!Number.isSafeInteger(units) || units <= 0) return bad("Invalid value", 409);

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    select: { type: true, remainingMinutes: true },
  });
  if (!pkg) return bad("Package not found", 404);
  if (pkg.type !== "HOURS") return bad("Only HOURS package is supported", 409);

  const updated = await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "CoursePackage" WHERE id=${packageId} FOR UPDATE`;
    const current=await tx.coursePackage.findUniqueOrThrow({where:{id:packageId},select:{remainingMinutes:true,type:true}});
    if(current.type!=="HOURS")return null;
    const updated=await tx.coursePackage.update({where:{id:packageId},data:{remainingMinutes:current.remainingMinutes===null?units:{increment:units}}});
    await tx.packageTxn.create({
      data: {
        packageId,
        kind: "GIFT",
        deltaMinutes: units,
        note: note || null,
      },
    });
    return updated;
  });

  if(!updated)return bad("Package type changed; reload / 课包类型已变化，请刷新",409);
  return Response.json({ ok: true, remainingMinutes: updated.remainingMinutes });
}

