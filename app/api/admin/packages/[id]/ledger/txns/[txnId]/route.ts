import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";
import { listPartnerBilling } from "@/lib/partner-billing";

const PARTNER_SOURCE_NAME = "新东方学生";

function isPartnerOnlinePackage(pkg: {
  settlementMode: string | null;
  student?: { sourceChannel?: { name: string | null } | null } | null;
}) {
  return pkg.settlementMode === "ONLINE_PACKAGE_END" && pkg.student?.sourceChannel?.name === PARTNER_SOURCE_NAME;
}

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; txnId: string }> }) {
  const admin = await requireAdmin();
  const actor = admin.email.trim().toLowerCase();
  if (actor !== "zhaohongwei0880@gmail.com") {
    return bad("Only zhao hongwei can edit ledger records", 403);
  }

  const { id: packageId, txnId } = await ctx.params;
  if (!packageId || !txnId) return bad("Missing id", 409);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const deltaMinutes = Number(body?.deltaMinutes);
  const note = String(body?.note ?? "").trim();
  if (!Number.isFinite(deltaMinutes)) return bad("Invalid deltaMinutes", 409);

  const txn = await prisma.packageTxn.findFirst({
    where: { id: txnId, packageId },
    select: { id: true, kind: true, deltaMinutes: true, packageId: true },
  });
  if (!txn) return bad("Ledger record not found", 404);

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      remainingMinutes: true,
      totalMinutes: true,
      settlementMode: true,
      student: { select: { sourceChannel: { select: { name: true } } } },
    },
  });
  if (!pkg) return bad("Package not found", 404);

  const diff = Math.round(deltaMinutes) - txn.deltaMinutes;
  const nextRemaining = (pkg.remainingMinutes ?? 0) + diff;
  if (nextRemaining < 0) return bad("Remaining minutes cannot be negative", 409);
  const isPurchase = txn.kind === "PURCHASE";
  const curTotal = pkg.totalMinutes ?? pkg.remainingMinutes ?? 0;
  const nextTotal = isPurchase ? curTotal + diff : curTotal;
  if (isPurchase && nextTotal < 0) return bad("Total minutes cannot be negative", 409);

  let settlementIdsToDelete: string[] = [];
  if (isPurchase && diff < 0 && isPartnerOnlinePackage(pkg)) {
    const overSnapshots = await prisma.partnerSettlement.findMany({
      where: {
        packageId,
        mode: "ONLINE_PACKAGE_END",
        onlineSnapshotTotalMinutes: { gt: nextTotal },
      },
      select: { id: true },
    });
    if (overSnapshots.length > 0) {
      const removeIds = overSnapshots.map((x) => x.id);
      const billing = await listPartnerBilling();
      const linkedInvoices = billing.invoices.filter((inv) => inv.settlementIds.some((sid) => removeIds.includes(sid)));
      if (linkedInvoices.length > 0) {
        return bad(
          `Cannot reduce top-up: settlements already linked to invoice(s): ${linkedInvoices.map((x) => x.invoiceNo).join(", ")}`,
          409
        );
      }
      settlementIdsToDelete = removeIds;
    }
  }

  await prisma.$transaction(async (tx) => {
    if (settlementIdsToDelete.length > 0) {
      await tx.partnerSettlement.deleteMany({ where: { id: { in: settlementIdsToDelete } } });
    }
    await tx.packageTxn.update({
      where: { id: txn.id },
      data: {
        deltaMinutes: Math.round(deltaMinutes),
        note: note || null,
      },
    });
    await tx.coursePackage.update({
      where: { id: packageId },
      data: isPurchase ? { remainingMinutes: nextRemaining, totalMinutes: nextTotal } : { remainingMinutes: nextRemaining },
    });
  });

  await logAudit({
    actor: admin,
    module: "PACKAGE_LEDGER",
    action: "TXN_UPDATE",
    entityType: "PackageTxn",
    entityId: txn.id,
    meta: { packageId, deltaMinutes: Math.round(deltaMinutes), note: note || null, diff, totalChanged: isPurchase, settlementIdsToDelete },
  });

  return Response.json({ ok: true, remainingMinutes: nextRemaining });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; txnId: string }> }) {
  const admin = await requireAdmin();
  const actor = admin.email.trim().toLowerCase();
  if (actor !== "zhaohongwei0880@gmail.com") {
    return bad("Only zhao hongwei can delete ledger records", 403);
  }

  const { id: packageId, txnId } = await ctx.params;
  if (!packageId || !txnId) return bad("Missing id", 409);

  const txn = await prisma.packageTxn.findFirst({
    where: { id: txnId, packageId },
    select: { id: true, kind: true, deltaMinutes: true, sessionId: true, note: true, createdAt: true },
  });
  if (!txn) return bad("Ledger record not found", 404);

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      remainingMinutes: true,
      totalMinutes: true,
      settlementMode: true,
      student: { select: { sourceChannel: { select: { name: true } } } },
    },
  });
  if (!pkg) return bad("Package not found", 404);

  const nextRemaining = (pkg.remainingMinutes ?? 0) - txn.deltaMinutes;
  if (nextRemaining < 0) return bad("Remaining minutes cannot be negative", 409);
  const isPurchase = txn.kind === "PURCHASE";
  const curTotal = pkg.totalMinutes ?? pkg.remainingMinutes ?? 0;
  const nextTotal = isPurchase ? curTotal - txn.deltaMinutes : curTotal;
  if (isPurchase && nextTotal < 0) return bad("Total minutes cannot be negative", 409);

  let settlementIdsToDelete: string[] = [];
  if (isPurchase && isPartnerOnlinePackage(pkg)) {
    const overSnapshots = await prisma.partnerSettlement.findMany({
      where: {
        packageId,
        mode: "ONLINE_PACKAGE_END",
        onlineSnapshotTotalMinutes: { gt: nextTotal },
      },
      select: { id: true },
    });
    if (overSnapshots.length > 0) {
      const removeIds = overSnapshots.map((x) => x.id);
      const billing = await listPartnerBilling();
      const linkedInvoices = billing.invoices.filter((inv) => inv.settlementIds.some((sid) => removeIds.includes(sid)));
      if (linkedInvoices.length > 0) {
        return bad(
          `Cannot rollback top-up: settlements already linked to invoice(s): ${linkedInvoices.map((x) => x.invoiceNo).join(", ")}`,
          409
        );
      }
      settlementIdsToDelete = removeIds;
    }
  }

  await prisma.$transaction(async (tx) => {
    if (settlementIdsToDelete.length > 0) {
      await tx.partnerSettlement.deleteMany({ where: { id: { in: settlementIdsToDelete } } });
    }
    await tx.packageTxn.delete({ where: { id: txn.id } });
    await tx.coursePackage.update({
      where: { id: packageId },
      data: isPurchase ? { remainingMinutes: nextRemaining, totalMinutes: nextTotal } : { remainingMinutes: nextRemaining },
    });
  });

  await logAudit({
    actor: admin,
    module: "PACKAGE_LEDGER",
    action: "TXN_DELETE",
    entityType: "PackageTxn",
    entityId: txn.id,
    meta: { packageId, deltaMinutes: txn.deltaMinutes, kind: txn.kind, totalChanged: isPurchase, settlementIdsToDelete },
  });

  return Response.json({
    ok: true,
    remainingMinutes: nextRemaining,
    deleted: {
      id: txn.id,
      kind: txn.kind,
      deltaMinutes: txn.deltaMinutes,
      sessionId: txn.sessionId,
      note: txn.note ?? "",
      createdAt: txn.createdAt.toISOString(),
    },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string; txnId: string }> }) {
  const admin = await requireAdmin();
  const actor = admin.email.trim().toLowerCase();
  if (actor !== "zhaohongwei0880@gmail.com") {
    return bad("Only zhao hongwei can undo delete", 403);
  }

  const { id: packageId } = await ctx.params;
  if (!packageId) return bad("Missing id", 409);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const kind = String(body?.kind ?? "").trim();
  const txnId = String(body?.id ?? "").trim();
  const note = String(body?.note ?? "").trim();
  const deltaMinutes = Number(body?.deltaMinutes);
  const sessionId = body?.sessionId ? String(body.sessionId) : null;
  const createdAt = String(body?.createdAt ?? "").trim();
  if (!kind) return bad("Invalid kind", 409);
  if (!txnId) return bad("Invalid id", 409);
  if (!Number.isFinite(deltaMinutes)) return bad("Invalid deltaMinutes", 409);
  const createdAtDate = new Date(createdAt);
  if (Number.isNaN(createdAtDate.getTime())) return bad("Invalid createdAt", 409);

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    select: { id: true, remainingMinutes: true, totalMinutes: true },
  });
  if (!pkg) return bad("Package not found", 404);

  const nextRemaining = (pkg.remainingMinutes ?? 0) + Math.round(deltaMinutes);
  if (nextRemaining < 0) return bad("Remaining minutes cannot be negative", 409);
  const isPurchase = kind === "PURCHASE";
  const curTotal = pkg.totalMinutes ?? pkg.remainingMinutes ?? 0;
  const nextTotal = isPurchase ? curTotal + Math.round(deltaMinutes) : curTotal;
  if (isPurchase && nextTotal < 0) return bad("Total minutes cannot be negative", 409);

  await prisma.$transaction([
    prisma.packageTxn.create({
      data: {
        id: txnId,
        packageId,
        kind,
        deltaMinutes: Math.round(deltaMinutes),
        sessionId,
        note: note || null,
        createdAt: createdAtDate,
      },
    }),
    prisma.coursePackage.update({
      where: { id: packageId },
      data: isPurchase ? { remainingMinutes: nextRemaining, totalMinutes: nextTotal } : { remainingMinutes: nextRemaining },
    }),
  ]);

  await logAudit({
    actor: admin,
    module: "PACKAGE_LEDGER",
    action: "TXN_RESTORE",
    entityType: "PackageTxn",
    entityId: txnId,
    meta: { packageId, deltaMinutes: Math.round(deltaMinutes), kind },
  });

  return Response.json({ ok: true, remainingMinutes: nextRemaining });
}
