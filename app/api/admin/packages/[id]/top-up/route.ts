import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildTopUpMinutesUpdate } from "@/lib/package-top-up";
import { buildPurchaseTxnCreates, normalizePurchaseBatches, sumPurchaseBatchMinutes } from "@/lib/package-purchase-batches";
import { DEFAULT_PARTNER_ONLINE_RATE_PER_45 } from "@/lib/partners";

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
  let purchaseBatches;
  try {
    purchaseBatches = normalizePurchaseBatches({
      batchesRaw: body?.purchaseBatches,
      fallbackMinutes: addMinutes,
      fallbackNote: note || null,
    });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Invalid purchase batches", 409);
  }
  const effectiveAddMinutes = sumPurchaseBatchMinutes(purchaseBatches);

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
    },
  });
  if (!pkg) return bad("Package not found", 404);
  if (pkg.type !== "HOURS") return bad("Only HOURS package can top-up", 409);

  await prisma.$transaction(async (tx) => {
    const pkgNow = await tx.coursePackage.findUnique({
      where: { id },
      select: {
        id: true,
        settlementMode: true,
        studentId: true,
        remainingMinutes: true,
        totalMinutes: true,
        course: { select: { name: true } },
        student: { select: { sourceChannelId: true } },
      },
    });
    if (!pkgNow) {
      throw new Error("Package not found");
    }

    const curRemain = pkgNow.remainingMinutes ?? 0;
    const curTotal = pkgNow.totalMinutes ?? pkgNow.remainingMinutes ?? 0;
    const partner = pkgNow.student?.sourceChannelId
      ? await tx.partner.findUnique({
          where: { sourceChannelId: pkgNow.student.sourceChannelId },
          select: { id: true, onlineRatePer45: true },
        })
      : null;
    const isPartnerOnlinePackage = pkgNow.settlementMode === "ONLINE_PACKAGE_END" && Boolean(partner);
    if (isPartnerOnlinePackage && curRemain <= 0) {
      const totalMinutesNow = Math.max(0, Number(curTotal));
      const [latestSnapshot, sameSnapshot] = await Promise.all([
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
      ]);
      const settledUpTo = Math.max(0, Number(latestSnapshot?.onlineSnapshotTotalMinutes ?? 0));
      const deltaMinutes = Math.max(0, totalMinutesNow - settledUpTo);
      const rate = Number(partner?.onlineRatePer45 ?? DEFAULT_PARTNER_ONLINE_RATE_PER_45);
      const ratePer45 = Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_PARTNER_ONLINE_RATE_PER_45;
      if (!sameSnapshot && deltaMinutes > 0) {
        try {
          await tx.partnerSettlement.create({
            data: {
              partnerId: partner!.id,
              studentId: pkgNow.studentId,
              packageId: id,
              onlineSnapshotTotalMinutes: totalMinutesNow,
              mode: "ONLINE_PACKAGE_END",
              status: "PENDING",
              hours: toHours(deltaMinutes),
              amount: calcAmountByRatePer45(deltaMinutes, ratePer45),
              note: `Auto snapshot before top-up: ${pkgNow.course?.name ?? "-"} | packageId=${id} | settled ${settledUpTo}->${totalMinutesNow} mins`,
            },
          });
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
            throw error;
          }
        }
      }
    }

    await tx.coursePackage.update({
      where: { id },
      data: {
        ...buildTopUpMinutesUpdate(
          {
            remainingMinutes: pkgNow.remainingMinutes,
            totalMinutes: pkgNow.totalMinutes,
          },
          effectiveAddMinutes
        ),
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

    const topUpTxns = buildPurchaseTxnCreates({
      batches: purchaseBatches,
      totalAmount: paidAmount,
      defaultNote: note || null,
      prefix: "Top-up",
    });
    for (const txn of topUpTxns) {
      await tx.packageTxn.create({
        data: {
          packageId: id,
          kind: txn.kind,
          deltaMinutes: txn.deltaMinutes,
          deltaAmount: txn.deltaAmount,
          note: txn.note,
          createdAt: txn.createdAt,
        },
      });
    }
  });

  return Response.json({ ok: true });
}
