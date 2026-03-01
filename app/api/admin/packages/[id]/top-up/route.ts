import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const PARTNER_SOURCE_NAME = "新东方学生";
const ONLINE_RATE_KEY = "partner_settlement_online_rate_per_45";
const DEFAULT_ONLINE_RATE_PER_45 = 70;

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function calcAmountByRatePer45(minutes: number, ratePer45: number) {
  if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(ratePer45) || ratePer45 < 0) return 0;
  return Math.round((minutes / 45) * ratePer45);
}

function toHours(minutes: number) {
  return Number((minutes / 60).toFixed(2));
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
    select: {
      id: true,
      type: true,
      settlementMode: true,
      studentId: true,
      remainingMinutes: true,
      totalMinutes: true,
      course: { select: { name: true } },
      student: { select: { sourceChannel: { select: { name: true } } } },
    },
  });
  if (!pkg) return bad("Package not found", 404);
  if (pkg.type !== "HOURS") return bad("Only HOURS package can top-up", 409);

  const curRemain = pkg.remainingMinutes ?? 0;
  const curTotal = pkg.totalMinutes ?? pkg.remainingMinutes ?? 0;

  await prisma.$transaction(async (tx) => {
    const isPartnerOnlinePackage =
      pkg.settlementMode === "ONLINE_PACKAGE_END" && pkg.student?.sourceChannel?.name === PARTNER_SOURCE_NAME;
    if (isPartnerOnlinePackage && curRemain <= 0) {
      const totalMinutesNow = Math.max(0, Number(curTotal));
      const [latestSnapshot, sameSnapshot, rateRow] = await Promise.all([
        tx.partnerSettlement.findFirst({
          where: {
            packageId: id,
            mode: "ONLINE_PACKAGE_END",
            onlineSnapshotTotalMinutes: { not: null },
          },
          orderBy: [{ onlineSnapshotTotalMinutes: "desc" }, { createdAt: "desc" }],
          select: { onlineSnapshotTotalMinutes: true },
        }),
        tx.partnerSettlement.findFirst({
          where: {
            packageId: id,
            mode: "ONLINE_PACKAGE_END",
            onlineSnapshotTotalMinutes: totalMinutesNow,
          },
          select: { id: true },
        }),
        tx.appSetting.findUnique({ where: { key: ONLINE_RATE_KEY }, select: { value: true } }),
      ]);
      const settledUpTo = Math.max(0, Number(latestSnapshot?.onlineSnapshotTotalMinutes ?? 0));
      const deltaMinutes = Math.max(0, totalMinutesNow - settledUpTo);
      const rate = Number(rateRow?.value ?? DEFAULT_ONLINE_RATE_PER_45);
      const ratePer45 = Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_ONLINE_RATE_PER_45;
      if (!sameSnapshot && deltaMinutes > 0) {
        await tx.partnerSettlement.create({
          data: {
            studentId: pkg.studentId,
            packageId: id,
            onlineSnapshotTotalMinutes: totalMinutesNow,
            mode: "ONLINE_PACKAGE_END",
            status: "PENDING",
            hours: toHours(deltaMinutes),
            amount: calcAmountByRatePer45(deltaMinutes, ratePer45),
            note: `Auto snapshot before top-up: ${pkg.course?.name ?? "-"} | packageId=${id} | settled ${settledUpTo}->${totalMinutesNow} mins`,
          },
        });
      }
    }

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
