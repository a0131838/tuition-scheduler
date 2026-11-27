import { BUSINESS_UPLOAD_PREFIX, storedBusinessFileExists } from "./business-file-storage";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getApprovalRoleConfig } from "./approval-flow";
import { getParentReceiptApprovalMap } from "./parent-receipt-approval";
import { getReceiptApprovalStatus } from "./receipt-approval-policy";
import { listAllParentBilling, type ParentInvoiceItem } from "./student-parent-billing";
import { formatBusinessDateOnly, parseBusinessDateEnd } from "./date-only";
import { legacyPackageEstimate } from "./student-package-month-end-balance";
import { contractIdFromPurchaseNote } from "./renewal-entitlement-policy";
import { isGroupCountPackNote } from "./package-mode";
import {
  remainingLots,
  reportDate,
  settledMinutes,
  unearnedCents,
  type Issue,
  type Movement,
} from "./prepaid-family-calculation";
import { settlementStatements } from "./prepaid-settlement-statements";

const cents = (amount: number) => Math.round(amount * 100);
const nonTuition =
  /transport|taxi|iTEP|test fee|exam fee|reimbursement|application fee|报名费|考试费|交通费/i;
const tuition = /tuition|course fees?|lesson fees?|student contract invoice|学费|课程费/i;
export type PrepaidRow = {
  id: string;
  family: string;
  familyId: string;
  course: string;
  minutes: number | null;
  legacyMinutes: number;
  legacyCents: number;
  prepaidCents: number | null;
  issues: Issue[];
  evidence: string[];
};
type Contract = {
  id: string;
  invoiceId: string | null;
  signedAt: Date | null;
  voidedAt: Date | null;
  businessInfoJson: Prisma.JsonValue;
};
function matchInvoice(txn: Movement, invoices: ParentInvoiceItem[], contracts: Contract[]) {
  const contractId = contractIdFromPurchaseNote(txn.note);
  const direct = contracts.filter((c) => c.id === contractId || txn.note?.includes(c.id));
  if (contractId || direct.length) {
    if (direct.length !== 1) return undefined;
    const terms = direct[0].businessInfoJson as { totalMinutes?: number; feeAmount?: number } | null;
    if (Number(terms?.totalMinutes) !== txn.deltaMinutes) return undefined;
    return invoices.find((i) => i.id === direct[0].invoiceId && Number(terms?.feeAmount) === i.totalAmount);
  }
  // Unlinked historical sales need a unique tuition invoice on the same business date,
  // exact documented purchase price and package. Equal amounts alone are insufficient.
  if (!txn.deltaAmount || txn.deltaAmount < 0) return undefined;
  const matches = invoices.filter(
    (i) =>
      i.issueDate === formatBusinessDateOnly(txn.createdAt) &&
      i.totalAmount === txn.deltaAmount &&
      tuition.test(i.description) &&
      !nonTuition.test(i.description),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export async function prepaidFamilyReport(date: string) {
  if (!reportDate(date)) throw Error("Invalid cutoff");
  const cutoff = parseBusinessDateEnd(date)!;
  return prisma.$transaction(
    async (db) => {
      await db.$queryRaw`SET TRANSACTION READ ONLY`;
      const billing = await listAllParentBilling(db);
      const receipts = billing.receipts.filter((r) => r.receiptDate && r.receiptDate <= date);
      const receiptPackageIds = [...new Set(receipts.map((r) => r.packageId))];
      const packages = await db.coursePackage.findMany({
        where: { type: "HOURS", OR: [{ createdAt: { lte: cutoff } }, { id: { in: receiptPackageIds } }] },
        select: {
          id: true,
          createdAt: true,
          settlementMode: true,
          paidAmount: true,
          note: true,
          student: { select: { id: true, name: true } },
          course: { select: { name: true } },
          sharedStudents: {
            where: { createdAt: { lte: cutoff } },
            select: { student: { select: { id: true, name: true } } },
          },
          txns: {
            where: { createdAt: { lte: cutoff } },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              kind: true,
              deltaMinutes: true,
              deltaAmount: true,
              createdAt: true,
              note: true,
              sessionId: true,
            },
          },
          contracts: {
            where: { createdAt: { lte: cutoff } },
            select: { id: true, invoiceId: true, signedAt: true, voidedAt: true, businessInfoJson: true },
          },
        },
        orderBy: { id: "asc" },
      });
      const links = await db.parentStudentLink.findMany({
        where: { canViewFinance: true, createdAt: { lte: cutoff }, parent: { status: "ACTIVE" } },
        select: { studentId: true, parentId: true, isPrimary: true },
      });
      const approvals = await getParentReceiptApprovalMap(
        receipts.map((r) => r.id),
        db,
      );
      const roles = await getApprovalRoleConfig(db);
      const proofById = new Map(billing.paymentRecords.map((p) => [p.id, p]));
      const proofIds = new Set(receipts.map((r) => r.paymentRecordId).filter(Boolean));
      const proofFiles = new Map(
        await Promise.all(
          billing.paymentRecords
            .filter((p) => proofIds.has(p.id))
            .map(
              async (p) =>
                [
                  p.id,
                  await storedBusinessFileExists(p.relativePath, BUSINESS_UPLOAD_PREFIX.paymentProofs),
                ] as const,
            ),
        ),
      );
      const invoiceContractCounts = new Map<string, number>();
      for (const p of packages)
        for (const c of p.contracts) {
          if (c.invoiceId && c.signedAt && c.signedAt <= cutoff && (!c.voidedAt || c.voidedAt > cutoff)) {
            invoiceContractCounts.set(c.invoiceId, (invoiceContractCounts.get(c.invoiceId) ?? 0) + 1);
          }
        }
      const receiptTotalsByProof = new Map<string, number>();
      for (const r of receipts)
        if (r.paymentRecordId)
          receiptTotalsByProof.set(
            r.paymentRecordId,
            (receiptTotalsByProof.get(r.paymentRecordId) ?? 0) + cents(r.amountReceived),
          );

      // Consolidate documented shared billing units and unambiguous finance-parent links.
      // Never group by display name or contact text.
      const parents = new Map<string, string>();
      function root(id: string): string {
        const parent = parents.get(id);
        if (!parent || parent === id) return id;
        const result = root(parent);
        parents.set(id, result);
        return result;
      }
      const join = (a: string, b: string) => {
        const left = root(a),
          right = root(b);
        if (left !== right) parents.set(right, left);
      };
      const names = new Map<string, string>();
      for (const p of packages)
        for (const s of [p.student, ...p.sharedStudents.map((s) => s.student)]) {
          names.set(s.id, s.name);
          join(p.student.id, s.id);
        }
      for (const id of names.keys()) {
        const candidates = links.filter((l) => l.studentId === id),
          primary = candidates.filter((l) => l.isPrimary);
        const selected = primary.length === 1 ? primary[0] : candidates.length === 1 ? candidates[0] : null;
        if (selected) join("parent/" + selected.parentId, id);
      }
      const familyNames = new Map<string, string[]>();
      for (const [id, name] of names) {
        const k = root(id);
        const group = familyNames.get(k) ?? [];
        group.push(name);
        familyNames.set(k, group);
      }
      const rows: PrepaidRow[] = [];
      for (const p of packages) {
        const rr = receipts.filter((r) => r.packageId === p.id);
        const legacy = legacyPackageEstimate(
          p.txns,
          rr.reduce((s, r) => s + r.amountReceived, 0),
          p.paidAmount,
        );
        const { minutes, lots, issues } = remainingLots(p.txns);
        const familyId = root(p.student.id);
        const row: PrepaidRow = {
          id: p.id,
          familyId,
          family: familyNames.get(familyId)!.slice().sort().join(" / "),
          course: p.course.name,
          minutes,
          legacyMinutes: legacy.remainingMinutes,
          legacyCents: cents(legacy.remainingAmount),
          prepaidCents: null,
          issues: [],
          evidence: [],
        };
        rows.push(row);
        if (settlementStatements[p.id]) {
          const settlement = settledMinutes(p.txns, settlementStatements[p.id], date);
          row.minutes = settlement.minutes;
          row.issues = [settlement.issue];
          row.evidence = [settlement.reference].filter(Boolean);
          continue;
        }
        if (isGroupCountPackNote(p.note)) {
          row.minutes = null;
          row.issues = ["unit"];
          continue;
        }
        const invoices = billing.invoices.filter((i) => i.packageId === p.id && i.issueDate <= date);
        const contracts = p.contracts.filter(
          (c) => c.signedAt && c.signedAt <= cutoff && (!c.voidedAt || c.voidedAt > cutoff),
        );
        const matches = lots.map((l) => matchInvoice(l.txn, invoices, contracts));
        const used = new Set<string>();
        let value = 0;
        for (const [index, lot] of lots.entries()) {
          const invoice = matches[index];
          if (!invoice) {
            if (lot.left || minutes === 0) issues.add("invoice");
            continue;
          }
          used.add(invoice.id);
          if (!lot.left && minutes > 0) continue;
          row.evidence.push(invoice.invoiceNo);
          if (
            matches.filter((i) => i?.id === invoice.id).length !== 1 ||
            (invoiceContractCounts.get(invoice.id) ?? 0) > 1
          ) {
            issues.add("duplicate");
            continue;
          }
          const gross = cents(invoice.totalAmount),
            net = cents(invoice.amount);
          if (
            nonTuition.test(invoice.description) ||
            !tuition.test(invoice.description) ||
            net <= 0 ||
            gross < net ||
            gross !== net + cents(invoice.gstAmount) ||
            (lot.txn.deltaAmount !== null && cents(lot.txn.deltaAmount) !== gross)
          ) {
            issues.add("invoice");
            continue;
          }
          const payments = rr.filter((r) => r.invoiceId === invoice.id);
          const received = payments.reduce((s, r) => s + cents(r.amountReceived), 0);
          const supported = payments.every((r) => {
            const proof = r.paymentRecordId && proofById.get(r.paymentRecordId);
            return (
              r.amountReceived > 0 &&
              proof &&
              proof.packageId === p.id &&
              proofFiles.get(proof.id) &&
              (!proof.paymentDate || proof.paymentDate <= date) &&
              (proof.paymentAmount == null
                ? receipts.filter((other) => other.paymentRecordId === proof.id).length === 1
                : receiptTotalsByProof.get(proof.id)! <= cents(proof.paymentAmount)) &&
              getReceiptApprovalStatus(approvals.get(r.id), roles) === "COMPLETED"
            );
          });
          row.evidence.push(...payments.map((r) => r.receiptNo));
          if (!received || received > gross || !supported) {
            issues.add("receipt");
            continue;
          }
          value += unearnedCents(net, gross, received, lot.txn.deltaMinutes, lot.left);
        }
        // Money received before crediting hours, a reversal, or an unattributed receipt
        // cannot silently disappear, even if the ledger has zero hours.
        for (const receipt of rr) {
          if (receipt.amountReceived <= 0) {
            issues.add("adjustment");
            continue;
          }
          if (receipt.invoiceId && used.has(receipt.invoiceId)) continue;
          const invoice = invoices.find((i) => i.id === receipt.invoiceId);
          const description = invoice?.description || receipt.description;
          if (!nonTuition.test(description) || tuition.test(description)) issues.add("excess");
        }
        if (!rr.length && !minutes) issues.add("receipt");
        if (
          minutes < 0 ||
          p.settlementMode === "ONLINE_PACKAGE_END" ||
          p.settlementMode === "OFFLINE_MONTHLY"
        )
          issues.add("settlement");
        row.issues = [...issues];
        row.evidence = [...new Set(row.evidence)];
        if (!issues.size) row.prepaidCents = value;
      }
      return rows.sort((a, b) => a.family.localeCompare(b.family) || a.id.localeCompare(b.id));
    },
    { isolationLevel: "RepeatableRead", timeout: 45000 },
  );
}

export function summarizePrepaid(rows: PrepaidRow[]) {
  return rows.reduce(
    (sum, r) => {
      sum.minutes += Math.max(0, r.minutes ?? 0);
      sum.arrears += Math.max(0, -(r.minutes ?? 0));
      sum.unknownHours += Number(r.minutes === null);
      sum.legacy += r.legacyCents;
      if (r.prepaidCents === null) {
        sum.pending++;
        sum.pendingMinutes += Math.max(0, r.minutes ?? 0);
      } else {
        sum.verified += r.prepaidCents;
        sum.comparableLegacy += r.legacyCents;
      }
      return sum;
    },
    {
      minutes: 0,
      arrears: 0,
      unknownHours: 0,
      legacy: 0,
      pending: 0,
      pendingMinutes: 0,
      verified: 0,
      comparableLegacy: 0,
    },
  );
}
