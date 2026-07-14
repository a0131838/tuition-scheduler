import { Prisma } from "@prisma/client";
import { logAudit } from "@/lib/audit-log";
import { normalizeDateOnly } from "@/lib/date-only";
import { getPartnerInvoiceById, type PartnerInvoiceItem } from "@/lib/partner-billing";
import { prisma } from "@/lib/prisma";

export const CREDIT_NOTE_SUPPLIER = {
  name: "GT Educational Institute Pte. Ltd.",
  address: "150 Orchard Road, #08-15, Orchard Plaza, Singapore 238841",
  registrationNo: "202303312G",
  gstRegistrationNo: null as string | null,
};

export type PartnerCreditDraftLineInput = {
  sourceInvoiceLineId: string;
  totalAmount: number;
  gstAmount: number;
};

type CreditUsageRow = {
  sourceInvoiceLineId: string | null;
  totalAmount: Prisma.Decimal | number | string;
};

function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function moneyNumber(value: Prisma.Decimal | number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
}

function dateOnly(value: string | Date | null | undefined) {
  return normalizeDateOnly(value, new Date()) ?? normalizeDateOnly(new Date())!;
}

function creditNotePrefix(issueDate: string) {
  return `RGT-CN-${issueDate.slice(0, 7).replace("-", "")}-`;
}

function nextCreditNoteNo(issueDate: string, existingNumbers: string[]) {
  const prefix = creditNotePrefix(issueDate);
  const max = existingNumbers.reduce((current, value) => {
    const match = new RegExp(`^${prefix}(\\d{4})$`, "i").exec(String(value ?? "").trim());
    return match ? Math.max(current, Number(match[1]) || 0) : current;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function validatePartnerCreditLines(input: {
  invoice: Pick<PartnerInvoiceItem, "lines" | "totalAmount">;
  requestedLines: PartnerCreditDraftLineInput[];
  existingUsage?: CreditUsageRow[];
}) {
  const invoiceLines = new Map(input.invoice.lines.map((line) => [line.id, line] as const));
  const usageByLine = new Map<string, number>();
  for (const row of input.existingUsage ?? []) {
    if (!row.sourceInvoiceLineId) continue;
    usageByLine.set(
      row.sourceInvoiceLineId,
      roundMoney((usageByLine.get(row.sourceInvoiceLineId) ?? 0) + moneyNumber(row.totalAmount)),
    );
  }

  const requestedByLine = new Map<string, PartnerCreditDraftLineInput>();
  for (const raw of input.requestedLines) {
    const sourceInvoiceLineId = String(raw.sourceInvoiceLineId ?? "").trim();
    const totalAmount = roundMoney(Number(raw.totalAmount ?? 0));
    const gstAmount = roundMoney(Number(raw.gstAmount ?? 0));
    if (!sourceInvoiceLineId || totalAmount <= 0) continue;
    if (!Number.isFinite(totalAmount) || !Number.isFinite(gstAmount)) throw new Error("Credit amounts must be valid numbers");
    if (gstAmount < 0 || gstAmount > totalAmount) throw new Error("GST credit must be between zero and the credited total");
    if (requestedByLine.has(sourceInvoiceLineId)) throw new Error("Each invoice line can appear only once in a credit note");
    requestedByLine.set(sourceInvoiceLineId, { sourceInvoiceLineId, totalAmount, gstAmount });
  }
  if (requestedByLine.size === 0) throw new Error("Enter a credit amount for at least one invoice line");

  const lines = Array.from(requestedByLine.values()).map((requested) => {
    const invoiceLine = invoiceLines.get(requested.sourceInvoiceLineId);
    if (!invoiceLine) throw new Error("The selected invoice line no longer exists");
    const alreadyCredited = usageByLine.get(requested.sourceInvoiceLineId) ?? 0;
    const remaining = roundMoney(Math.max(0, Number(invoiceLine.totalAmount) - alreadyCredited));
    if (requested.totalAmount > remaining + 0.009) {
      throw new Error(`Credit for "${invoiceLine.description}" exceeds the remaining SGD ${remaining.toFixed(2)}`);
    }
    return {
      sourceInvoiceLineId: invoiceLine.id,
      description: invoiceLine.description,
      quantity: 1,
      amount: roundMoney(requested.totalAmount - requested.gstAmount),
      gstAmount: requested.gstAmount,
      totalAmount: requested.totalAmount,
    };
  });

  const totalAmount = roundMoney(lines.reduce((sum, line) => sum + line.totalAmount, 0));
  const gstAmount = roundMoney(lines.reduce((sum, line) => sum + line.gstAmount, 0));
  const amount = roundMoney(totalAmount - gstAmount);
  const totalExisting = roundMoney(Array.from(usageByLine.values()).reduce((sum, value) => sum + value, 0));
  if (totalExisting + totalAmount > Number(input.invoice.totalAmount) + 0.009) {
    throw new Error("Total credits cannot exceed the original invoice total");
  }
  return { lines, amount, gstAmount, totalAmount };
}

async function loadPartnerInvoiceOrThrow(invoiceId: string) {
  const invoice = await getPartnerInvoiceById(invoiceId.trim());
  if (!invoice) throw new Error("Partner invoice not found");
  return invoice;
}

export async function createPartnerCreditNoteDraft(input: {
  invoiceId: string;
  issueDate: string;
  reason: string;
  customerAddress?: string | null;
  lines: PartnerCreditDraftLineInput[];
  actorEmail: string;
  actorRole?: string | null;
}) {
  const invoice = await loadPartnerInvoiceOrThrow(input.invoiceId);
  const reason = input.reason.trim();
  if (reason.length < 5) throw new Error("Credit reason is required");
  const issueDate = dateOnly(input.issueDate);

  let created: Awaited<ReturnType<typeof prisma.creditNote.create>> | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      created = await prisma.$transaction(async (tx) => {
        const prefix = creditNotePrefix(issueDate);
        const [existing, usage] = await Promise.all([
          tx.creditNote.findMany({
            where: { creditNoteNo: { startsWith: prefix } },
            select: { creditNoteNo: true },
          }),
          tx.creditNoteLine.findMany({
            where: {
              creditNote: {
                sourceType: "PARTNER_INVOICE",
                sourceInvoiceId: invoice.id,
                status: { not: "VOID" },
              },
            },
            select: { sourceInvoiceLineId: true, totalAmount: true },
          }),
        ]);
        const calculated = validatePartnerCreditLines({ invoice, requestedLines: input.lines, existingUsage: usage });
        return tx.creditNote.create({
          data: {
            sourceType: "PARTNER_INVOICE",
            sourceInvoiceId: invoice.id,
            sourceInvoiceNo: invoice.invoiceNo,
            sourceInvoiceDate: dateOnly(invoice.issueDate),
            sourceInvoiceSnapshot: JSON.parse(JSON.stringify(invoice)) as Prisma.InputJsonValue,
            creditNoteNo: nextCreditNoteNo(issueDate, existing.map((row) => row.creditNoteNo)),
            issueDate,
            currency: "SGD",
            supplierName: CREDIT_NOTE_SUPPLIER.name,
            supplierAddress: CREDIT_NOTE_SUPPLIER.address,
            supplierRegistrationNo: CREDIT_NOTE_SUPPLIER.registrationNo,
            supplierGstRegistrationNo: CREDIT_NOTE_SUPPLIER.gstRegistrationNo,
            customerName: invoice.billTo || invoice.partnerName,
            customerAddress: input.customerAddress?.trim() || null,
            reason,
            originalInvoiceTotal: invoice.totalAmount,
            amount: calculated.amount,
            gstAmount: calculated.gstAmount,
            totalAmount: calculated.totalAmount,
            status: "DRAFT",
            createdBy: input.actorEmail.trim().toLowerCase(),
            lines: { create: calculated.lines },
          },
          include: { lines: true },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      break;
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034");
      if (!retryable || attempt === 2) throw error;
    }
  }
  if (!created) throw new Error("Credit note draft was not created");
  await logAudit({
    actor: { email: input.actorEmail, role: input.actorRole },
    module: "PARTNER_CREDIT_NOTE",
    action: "CREATE_DRAFT",
    entityType: "CreditNote",
    entityId: created.id,
    meta: { creditNoteNo: created.creditNoteNo, sourceInvoiceNo: invoice.invoiceNo, totalAmount: moneyNumber(created.totalAmount) },
  });
  return created;
}

export async function updatePartnerCreditNoteDraft(input: {
  creditNoteId: string;
  issueDate: string;
  reason: string;
  customerAddress?: string | null;
  lines: PartnerCreditDraftLineInput[];
  actorEmail: string;
  actorRole?: string | null;
}) {
  const current = await prisma.creditNote.findUnique({ where: { id: input.creditNoteId }, include: { lines: true } });
  if (!current || current.sourceType !== "PARTNER_INVOICE") throw new Error("Credit note not found");
  if (current.status !== "DRAFT") throw new Error("Only draft credit notes can be edited");
  const invoice = await loadPartnerInvoiceOrThrow(current.sourceInvoiceId);
  const reason = input.reason.trim();
  if (reason.length < 5) throw new Error("Credit reason is required");
  const nextIssueDate = dateOnly(input.issueDate);
  if (!current.creditNoteNo.startsWith(creditNotePrefix(nextIssueDate))) {
    throw new Error("Credit note date must remain in the numbered month; void this draft and create a new one for another month");
  }
  const updated = await prisma.$transaction(async (tx) => {
    const locked = await tx.creditNote.findUnique({ where: { id: current.id } });
    if (!locked || locked.status !== "DRAFT") throw new Error("Only draft credit notes can be edited");
    const usage = await tx.creditNoteLine.findMany({
      where: {
        creditNote: {
          sourceType: "PARTNER_INVOICE",
          sourceInvoiceId: invoice.id,
          status: { not: "VOID" },
          id: { not: current.id },
        },
      },
      select: { sourceInvoiceLineId: true, totalAmount: true },
    });
    const calculated = validatePartnerCreditLines({ invoice, requestedLines: input.lines, existingUsage: usage });
    await tx.creditNoteLine.deleteMany({ where: { creditNoteId: current.id } });
    return tx.creditNote.update({
      where: { id: current.id },
      data: {
        issueDate: nextIssueDate,
        customerAddress: input.customerAddress?.trim() || null,
        reason,
        amount: calculated.amount,
        gstAmount: calculated.gstAmount,
        totalAmount: calculated.totalAmount,
        lines: { create: calculated.lines },
      },
      include: { lines: true },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await logAudit({
    actor: { email: input.actorEmail, role: input.actorRole },
    module: "PARTNER_CREDIT_NOTE",
    action: "UPDATE_DRAFT",
    entityType: "CreditNote",
    entityId: updated.id,
    meta: { creditNoteNo: updated.creditNoteNo, sourceInvoiceNo: updated.sourceInvoiceNo, totalAmount: moneyNumber(updated.totalAmount) },
  });
  return updated;
}

export async function issuePartnerCreditNote(input: {
  creditNoteId: string;
  actorEmail: string;
  actorRole?: string | null;
}) {
  const current = await prisma.creditNote.findUnique({ where: { id: input.creditNoteId }, include: { lines: true } });
  if (!current || current.sourceType !== "PARTNER_INVOICE") throw new Error("Credit note not found");
  if (current.status !== "DRAFT") throw new Error("Only draft credit notes can be issued");
  if (!current.customerAddress?.trim()) throw new Error("Customer address is required before issuing the credit note");
  const invoice = await loadPartnerInvoiceOrThrow(current.sourceInvoiceId);
  const issued = await prisma.$transaction(async (tx) => {
    const locked = await tx.creditNote.findUnique({ where: { id: current.id }, include: { lines: true } });
    if (!locked || locked.status !== "DRAFT") throw new Error("Only draft credit notes can be issued");
    const usage = await tx.creditNoteLine.findMany({
      where: {
        creditNote: {
          sourceType: "PARTNER_INVOICE",
          sourceInvoiceId: invoice.id,
          status: { not: "VOID" },
          id: { not: current.id },
        },
      },
      select: { sourceInvoiceLineId: true, totalAmount: true },
    });
    validatePartnerCreditLines({
      invoice,
      requestedLines: locked.lines.map((line) => ({
        sourceInvoiceLineId: line.sourceInvoiceLineId ?? "",
        totalAmount: moneyNumber(line.totalAmount),
        gstAmount: moneyNumber(line.gstAmount),
      })),
      existingUsage: usage,
    });
    return tx.creditNote.update({
      where: { id: current.id },
      data: { status: "ISSUED", issuedAt: new Date(), issuedBy: input.actorEmail.trim().toLowerCase() },
      include: { lines: true },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await logAudit({
    actor: { email: input.actorEmail, role: input.actorRole },
    module: "PARTNER_CREDIT_NOTE",
    action: "ISSUE",
    entityType: "CreditNote",
    entityId: issued.id,
    meta: { creditNoteNo: issued.creditNoteNo, sourceInvoiceNo: issued.sourceInvoiceNo, totalAmount: moneyNumber(issued.totalAmount) },
  });
  return issued;
}

export async function voidPartnerCreditNote(input: {
  creditNoteId: string;
  reason: string;
  actorEmail: string;
  actorRole?: string | null;
}) {
  const reason = input.reason.trim();
  if (reason.length < 5) throw new Error("Void reason is required");
  const current = await prisma.creditNote.findUnique({ where: { id: input.creditNoteId } });
  if (!current || current.sourceType !== "PARTNER_INVOICE") throw new Error("Credit note not found");
  if (current.status === "VOID") throw new Error("Credit note is already voided");
  const voided = await prisma.creditNote.update({
    where: { id: current.id },
    data: {
      status: "VOID",
      voidedAt: new Date(),
      voidedBy: input.actorEmail.trim().toLowerCase(),
      voidReason: reason,
    },
    include: { lines: true },
  });
  await logAudit({
    actor: { email: input.actorEmail, role: input.actorRole },
    module: "PARTNER_CREDIT_NOTE",
    action: "VOID",
    entityType: "CreditNote",
    entityId: voided.id,
    meta: { creditNoteNo: voided.creditNoteNo, sourceInvoiceNo: voided.sourceInvoiceNo, reason },
  });
  return voided;
}

export async function getPartnerCreditNoteById(id: string) {
  return prisma.creditNote.findFirst({
    where: { id: id.trim(), sourceType: "PARTNER_INVOICE" },
    include: { lines: { orderBy: { createdAt: "asc" } } },
  });
}

export async function listPartnerCreditNotes(invoiceIds?: string[]) {
  return prisma.creditNote.findMany({
    where: {
      sourceType: "PARTNER_INVOICE",
      ...(invoiceIds ? { sourceInvoiceId: { in: invoiceIds } } : {}),
    },
    include: { lines: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ createdAt: "desc" }],
  });
}

export function summarizePartnerCreditNotes<T extends { sourceInvoiceId: string; status: string; totalAmount: Prisma.Decimal | number | string }>(notes: T[]) {
  const issuedByInvoice = new Map<string, number>();
  for (const note of notes) {
    if (note.status !== "ISSUED") continue;
    issuedByInvoice.set(
      note.sourceInvoiceId,
      roundMoney((issuedByInvoice.get(note.sourceInvoiceId) ?? 0) + moneyNumber(note.totalAmount)),
    );
  }
  return issuedByInvoice;
}
