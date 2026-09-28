import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { contractIdFromPurchaseNote, renewalEntitlementUnit, validMonthlyExtension } from "./renewal-entitlement-policy";

type Task = { id: string; studentId: string; packageId: string; createdAt: Date; contractId: string | null };
export type EntitlementInput = {
  activatedPackageId?: string | null; contractId?: string | null; invoiceId?: string | null;
  entitlementEvidenceIds?: string[]; entitlementReviewNote?: string;
};
export type EntitlementCandidate = {
  id: string; kind: "PURCHASE" | "VALIDITY"; createdAt: string; quantity: number | null;
  unit: "MINUTES" | "COUNT" | "PERIOD"; contractId: string | null; invoiceId: string | null;
  requiresReview: boolean; blocker: "USED" | "CONTRACT" | "CORRECTION" | "PERIOD" | null;
};

export async function getRenewalEntitlementEvidence(task: Task, input: EntitlementInput = {}, db: Prisma.TransactionClient = prisma) {
  const source = await db.coursePackage.findUniqueOrThrow({ where: { id: task.packageId } });
  const targetId = input.activatedPackageId || task.packageId;
  const target = targetId === source.id ? source : await db.coursePackage.findUniqueOrThrow({ where: { id: targetId } });
  if (source.studentId !== task.studentId || target.studentId !== task.studentId || target.courseId !== source.courseId ||
    target.type !== source.type || renewalEntitlementUnit(target) !== renewalEntitlementUnit(source) || target.settlementMode !== source.settlementMode) {
    throw new Error("Renewal package ownership, course or units differ; keep it pending review. / 续费课包归属、课程或单位不一致，请保留待核对。");
  }
  const unit = renewalEntitlementUnit(target);
  const postpaid = ["ONLINE_PACKAGE_END", "OFFLINE_MONTHLY"].includes(target.settlementMode || "");
  const now = new Date();
  const packageReady = target.status === "ACTIVE" && target.validFrom <= now && (!target.validTo || target.validTo >= now) &&
    (postpaid || ["EXEMPT", "SCHEDULABLE"].includes(target.financeGateStatus));
  const txns = await db.packageTxn.findMany({ where: { packageId: targetId }, orderBy: { createdAt: "desc" } });
  const contracts = await db.studentContract.findMany({ where: { packageId: targetId, studentId: task.studentId }, orderBy: { createdAt: "desc" } });
  const contractById = new Map(contracts.map(c => [c.id, c]));
  const candidates: EntitlementCandidate[] = [];
  for (const txn of txns) {
    if (txn.kind !== "PURCHASE" || (unit === "PERIOD" ? txn.deltaMinutes !== 0 || targetId === source.id : txn.deltaMinutes <= 0)) continue;
    const markerId = contractIdFromPurchaseNote(txn.note);
    const contract = markerId ? contractById.get(markerId) : null;
    const contractValid = !markerId || Boolean(contract && ["SIGNED", "INVOICE_CREATED"].includes(contract.status) && contract.signedAt && !contract.voidedAt && contract.flowType === "RENEWAL");
    const correction = txns.some(t => t.createdAt >= txn.createdAt && t.deltaMinutes < 0 && t.kind !== "DEDUCT");
    candidates.push({ id: txn.id, kind: "PURCHASE", createdAt: txn.createdAt.toISOString(), quantity: unit === "PERIOD" ? null : txn.deltaMinutes,
      unit, contractId: markerId, invoiceId: contract?.invoiceId || null,
      requiresReview: !markerId || txn.createdAt < task.createdAt,
      blocker: !contractValid ? "CONTRACT" : correction ? "CORRECTION" : unit === "PERIOD" && !target.validTo ? "PERIOD" : null,
    });
  }
  if (unit === "PERIOD") {
    const changes = await db.auditLog.findMany({ where: { module: "PACKAGE", action: "UPDATE_PACKAGE_VALIDITY", entityId: targetId }, orderBy: { createdAt: "desc" } });
    for (const row of changes) {
      const meta = row.meta as { studentId?: string; courseId?: string } | null;
      if (meta?.studentId !== task.studentId || meta.courseId !== target.courseId) continue;
      candidates.push({ id: `validity:${row.id}`, kind: "VALIDITY", createdAt: row.createdAt.toISOString(), quantity: null, unit,
        contractId: null, invoiceId: null, requiresReview: true, blocker: validMonthlyExtension(row.meta, target) ? null : "PERIOD" });
    }
  }
  const history = await db.auditLog.findMany({ where: { module: "RENEWAL", action: "UPDATE_RENEWAL_TASK", entityId: { not: task.id },
    meta: { path: ["entitlementEvidence", "packageId"], equals: targetId } }, select: { meta: true } });
  const usedIds = new Set(history.flatMap(h => {
    const m = h.meta as { entitlementEvidence?: { evidenceIds?: string[] } } | null;
    return m?.entitlementEvidence?.evidenceIds || [];
  }));
  const usedPeriodEnds = history.flatMap(h => {
    const proof = (h.meta as { entitlementEvidence?: { unit?: string; validTo?: string } } | null)?.entitlementEvidence;
    return proof?.unit === "PERIOD" && proof.validTo ? [Date.parse(proof.validTo)] : [];
  });
  const periodAlreadyVerified = unit === "PERIOD" && target.validTo && usedPeriodEnds.some(end => end >= target.validTo!.getTime());
  for (const c of candidates) if (usedIds.has(c.id) || periodAlreadyVerified) c.blocker = "USED";
  const contractId = input.contractId === undefined ? task.contractId : input.contractId;
  const automaticIds = contractId ? candidates.filter(c => c.contractId === contractId && !c.blocker && !c.requiresReview).map(c => c.id) : [];
  const availablePackages = await db.coursePackage.findMany({ where: { studentId: task.studentId, courseId: source.courseId, type: source.type, settlementMode: source.settlementMode }, orderBy: { createdAt: "desc" } });
  return {
    packageId: targetId, unit, packageReady, validFrom: target.validFrom.toISOString(), validTo: target.validTo?.toISOString() || null,
    candidates, automaticIds,
    packages: availablePackages.filter(p => renewalEntitlementUnit(p) === unit).map(p => ({ id: p.id, status: p.status, createdAt: p.createdAt.toISOString(), validTo: p.validTo?.toISOString() || null })),
    contracts: contracts.filter(c => !["VOID", "EXPIRED"].includes(c.status)).map(c => ({ id: c.id, invoiceNo: c.invoiceNo, status: c.status, createdAt: c.createdAt.toISOString() })),
  };
}

export async function verifyRenewalEntitlement(task: Task, input: EntitlementInput, db: Prisma.TransactionClient) {
  const evidence = await getRenewalEntitlementEvidence(task, input, db);
  if (!evidence.packageReady) throw new Error("The selected package is inactive, outside its validity or blocked by Finance. / 所选课包未生效、已过期或尚未通过财务门槛。");
  if (input.contractId) {
    const linked = await db.studentContract.findUnique({ where: { id: input.contractId } });
    if (!linked || linked.studentId !== task.studentId || linked.packageId !== evidence.packageId ||
      !["SIGNED", "INVOICE_CREATED"].includes(linked.status) || !linked.signedAt || linked.voidedAt ||
      (linked.flowType !== "RENEWAL" && evidence.packageId === task.packageId)) {
      throw new Error("Selected contract cannot verify this renewal. Review or explicitly clear the stale link. / 所选合同不能核验本次续费，请核对或明确取消过期关联。");
    }
  }
  let ids = input.entitlementEvidenceIds;
  let reviewNote = String(input.entitlementReviewNote || "").trim().slice(0, 1000);
  if (ids === undefined) {
    const prior = await db.auditLog.findFirst({ where: { module: "RENEWAL", action: "UPDATE_RENEWAL_TASK", entityId: task.id,
      meta: { path: ["entitlementEvidence", "packageId"], equals: evidence.packageId } }, orderBy: { createdAt: "desc" }, select: { meta: true } });
    const previous = (prior?.meta as { entitlementEvidence?: { evidenceIds?: string[]; reviewNote?: string } } | null)?.entitlementEvidence;
    ids = previous?.evidenceIds || evidence.automaticIds;
    reviewNote ||= previous?.reviewNote || "";
  }
  if (!Array.isArray(ids) || !ids.length || ids.length > 30 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== "string")) {
    throw new Error("Select the actual purchase or period-extension evidence in the web renewal desk. / 请在网页续费台选择实际购入或有效期延长凭据。");
  }
  const selected = ids.map(id => evidence.candidates.find(c => c.id === id));
  if (selected.some(c => !c || c.blocker)) throw new Error("Entitlement evidence is missing, reused, corrected or no longer valid. Keep this task pending review. / 权益凭据缺失、已使用、发生冲正或已失效，请保留待核对。");
  const rows = selected as EntitlementCandidate[];
  if (evidence.unit === "PERIOD" && rows.length !== 1) throw new Error("Select one period-extension event or new monthly package purchase. / 请选择一条续期记录或新月包购买记录。");
  const contractIds = [...new Set(rows.map(r => r.contractId).filter((id): id is string => Boolean(id)))];
  if (contractIds.length) {
    if (contractIds.length !== 1 || rows.some(r => r.contractId !== contractIds[0])) throw new Error("Do not mix different contract purchases in one renewal. / 请勿混用不同合同的购买凭据。");
    if (input.contractId && input.contractId !== contractIds[0]) throw new Error("Selected contract and purchase differ. / 所选合同与购买凭据不一致。");
    const contract = await db.studentContract.findUniqueOrThrow({ where: { id: contractIds[0] } });
    const snapshot = contract.contractSnapshotJson as { package?: { totalMinutes?: number } } | null;
    const expected = snapshot?.package?.totalMinutes;
    if (!Number.isFinite(expected) || Number(expected) <= 0 || rows.reduce((sum, r) => sum + (r.quantity || 0), 0) !== expected) {
      throw new Error("The purchase does not match the signed renewal quantity. / 购入数量与已签续费合同不一致。");
    }
    if (input.invoiceId && contract.invoiceId !== input.invoiceId) throw new Error("The paid invoice and purchase contract differ. / 收款发票与购入权益的合同不一致。");
  }
  if (rows.some(r => r.requiresReview) && reviewNote.length < 10) throw new Error("Record which purchase or period belongs to this renewal (at least 10 characters). / 请填写本次购入或续期的核对依据（至少10个字符）。");
  return { packageId: evidence.packageId, unit: evidence.unit, evidenceIds: ids, quantity: evidence.unit === "PERIOD" ? null : rows.reduce((sum, r) => sum + (r.quantity || 0), 0),
    validFrom: evidence.validFrom, validTo: evidence.validTo, contractId: contractIds[0] || null, reviewNote: reviewNote || null, checkedAt: new Date().toISOString() };
}
