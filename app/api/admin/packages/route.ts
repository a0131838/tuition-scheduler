import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { composePackageNote, GROUP_PACK_MINUTES_TAG, GROUP_PACK_TAG } from "@/lib/package-mode";
import { parseBusinessDateEnd, parseBusinessDateStart } from "@/lib/date-only";
import { buildPurchaseTxnCreates, normalizePurchaseBatches, sumPurchaseBatchMinutes } from "@/lib/package-purchase-batches";
import { createParentInvoice, deleteParentInvoice } from "@/lib/student-parent-billing";
import { assertGlobalInvoiceNoAvailable, getNextGlobalInvoiceNo, parseInvoiceNoParts, resequenceGlobalInvoiceNumbersForMonth } from "@/lib/global-invoice-sequence";
import {
  buildPackageFinanceGateReason,
  createPackageInvoiceApproval,
  shouldRequirePackageInvoiceGate,
} from "@/lib/package-finance-gate";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseSettlementMode(v: unknown) {
  const x = String(v ?? "");
  if (x === "ONLINE_PACKAGE_END" || x === "OFFLINE_MONTHLY") return x;
  return null;
}

function parseMoney(raw: unknown) {
  if (raw === "" || raw == null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) / 100 : NaN;
}

type PackageModeKey = "HOURS_MINUTES" | "GROUP_MINUTES" | "GROUP_COUNT" | "MONTHLY";

function modeKeyFromCreateType(typeRaw: string, type: string): PackageModeKey {
  if (type === "MONTHLY") return "MONTHLY";
  if (typeRaw === "GROUP_MINUTES") return "GROUP_MINUTES";
  if (typeRaw === "GROUP_COUNT") return "GROUP_COUNT";
  return "HOURS_MINUTES";
}

function sameModeWhere(mode: PackageModeKey) {
  if (mode === "MONTHLY") return { type: "MONTHLY" as const };
  if (mode === "GROUP_MINUTES") {
    return { type: "HOURS" as const, note: { startsWith: GROUP_PACK_MINUTES_TAG } };
  }
  if (mode === "GROUP_COUNT") {
    return { type: "HOURS" as const, note: { startsWith: GROUP_PACK_TAG } };
  }
  return {
    type: "HOURS" as const,
    OR: [
      { note: null },
      {
        AND: [
          { NOT: { note: { startsWith: GROUP_PACK_TAG } } },
          { NOT: { note: { startsWith: GROUP_PACK_MINUTES_TAG } } },
        ],
      },
    ],
  };
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const studentId = String(body?.studentId ?? "");
  const courseId = String(body?.courseId ?? "");
  const typeRaw = String(body?.type ?? "HOURS");
  const type = typeRaw === "GROUP_COUNT" || typeRaw === "GROUP_MINUTES" ? "HOURS" : typeRaw;
  const status = String(body?.status ?? "PAUSED");
  const settlementMode = parseSettlementMode(body?.settlementMode);

  const validFromStr = String(body?.validFrom ?? "");
  const validToStr = String(body?.validTo ?? "");
  const noteRaw = String(body?.note ?? "");
  const paid = !!body?.paid;
  const paidAtStr = String(body?.paidAt ?? "");
  const paidAmountRaw = body?.paidAmount;
  const paidNote = String(body?.paidNote ?? "");
  const invoiceGateExempt = !!body?.invoiceGateExempt;
  const invoiceAmountParsed = parseMoney(body?.invoiceAmount);
  const invoiceGstAmountParsed = parseMoney(body?.invoiceGstAmount);
  const sharedStudentIdsRaw: string[] = Array.isArray(body?.sharedStudentIds)
    ? (body.sharedStudentIds as any[]).map((v) => String(v)).filter(Boolean)
    : [];
  const sharedStudentIds = Array.from(new Set(sharedStudentIdsRaw)).filter((id) => id !== studentId);
  const sharedCourseIdsRaw: string[] = Array.isArray(body?.sharedCourseIds)
    ? (body.sharedCourseIds as any[]).map((v) => String(v)).filter(Boolean)
    : [];
  const sharedCourseIds = Array.from(new Set(sharedCourseIdsRaw)).filter((id) => id !== courseId);

  const totalMinutes = Number(body?.totalMinutes ?? 0);

  if (!studentId || !courseId || !validFromStr) {
    return bad("Missing studentId/courseId/validFrom", 409);
  }

  if (sharedStudentIds.length > 0) {
    const rows = await prisma.student.findMany({
      where: { id: { in: sharedStudentIds } },
      select: { id: true },
    });
    if (rows.length !== sharedStudentIds.length) {
      return bad("Invalid sharedStudentIds", 409);
    }
  }

  if (sharedCourseIds.length > 0) {
    const rows = await prisma.course.findMany({
      where: { id: { in: sharedCourseIds } },
      select: { id: true },
    });
    if (rows.length !== sharedCourseIds.length) {
      return bad("Invalid sharedCourseIds", 409);
    }
  }

  const validFrom = parseBusinessDateStart(validFromStr);
  const validTo = validToStr ? parseBusinessDateEnd(validToStr) : null;
  if (!validFrom || (validToStr && !validTo)) return bad("Invalid validFrom/validTo", 409);

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

  const requiresInvoiceGate = shouldRequirePackageInvoiceGate({
    settlementMode: settlementMode as any,
    invoiceGateExempt,
  });
  if (requiresInvoiceGate) {
    if (invoiceAmountParsed == null || !Number.isFinite(invoiceAmountParsed) || invoiceAmountParsed <= 0) {
      return bad("Direct-billing package requires a positive invoice amount", 409);
    }
    if (invoiceGstAmountParsed != null && !Number.isFinite(invoiceGstAmountParsed)) {
      return bad("Invalid invoice GST amount", 409);
    }
  }

  const overlapCheckTo = validTo ?? new Date(2999, 0, 1);
  const createMode = modeKeyFromCreateType(typeRaw, type);
  // MONTHLY packages must not overlap in active period.
  // HOURS/GROUP packages are allowed to coexist (staff can sell a new package or top-up).
  if (createMode === "MONTHLY") {
    const overlap = await prisma.coursePackage.findFirst({
      where: {
        studentId,
        courseId,
        ...sameModeWhere(createMode),
        status: "ACTIVE",
        validFrom: { lte: overlapCheckTo },
        OR: [{ validTo: null }, { validTo: { gte: validFrom } }],
      },
      select: { id: true },
    });
    if (overlap) return bad("Overlapping ACTIVE package exists", 409);
  }

  const packageNote = composePackageNote(
    typeRaw === "GROUP_MINUTES" || typeRaw === "GROUP_COUNT" ? typeRaw : "HOURS_MINUTES",
    noteRaw
  );
  const now = new Date();
  const invoiceIssueDate = validFromStr || now.toISOString().slice(0, 10);
  let createdPackageId: string | null = null;
  let createdInvoiceId: string | null = null;
  let createdInvoiceMonthKey: string | null = null;

  const createFinanceGateData = (invoiceNo?: string | null) => ({
    financeGateStatus: requiresInvoiceGate ? ("INVOICE_PENDING_MANAGER" as const) : ("EXEMPT" as const),
    financeGateReason: buildPackageFinanceGateReason({
      status: requiresInvoiceGate ? "INVOICE_PENDING_MANAGER" : "EXEMPT",
      invoiceNo,
      settlementMode: settlementMode as any,
    }),
    financeGateUpdatedAt: now,
    financeGateUpdatedBy: admin.email,
  });

  async function finalizeDirectBillingGate(input: {
    packageId: string;
    studentName: string;
    courseName: string;
    totalMinutesForDescription?: number | null;
  }) {
    if (!requiresInvoiceGate) return;
    const invoiceNo = await getNextGlobalInvoiceNo(invoiceIssueDate);
    await assertGlobalInvoiceNoAvailable(invoiceNo);
    const invoiceAmount = Number(invoiceAmountParsed ?? 0);
    const invoiceGstAmount = Number(invoiceGstAmountParsed ?? 0);
    const invoiceTotalAmount = Math.round((invoiceAmount + invoiceGstAmount + Number.EPSILON) * 100) / 100;
    const invoice = await createParentInvoice({
      packageId: input.packageId,
      studentId,
      invoiceNo,
      issueDate: invoiceIssueDate,
      dueDate: invoiceIssueDate,
      courseStartDate: validFromStr || null,
      courseEndDate: validToStr || null,
      billTo: input.studentName,
      quantity: 1,
      description:
        input.totalMinutesForDescription && input.totalMinutesForDescription > 0
          ? `Course package invoice for ${input.studentName} (${input.courseName}, ${Math.round(input.totalMinutesForDescription / 60)} hours)`
          : `Course package invoice for ${input.studentName} (${input.courseName})`,
      amount: invoiceAmount,
      gstAmount: invoiceGstAmount,
      totalAmount: invoiceTotalAmount,
      paymentTerms: "Immediate",
      note: "Auto-created with package creation. Waiting for manager approval.",
      createdBy: admin.email,
    });
    createdInvoiceId = invoice.id;
    createdInvoiceMonthKey = parseInvoiceNoParts(invoice.invoiceNo)?.monthKey ?? null;
    await prisma.coursePackage.update({
      where: { id: input.packageId },
      data: createFinanceGateData(invoice.invoiceNo),
    });
    await createPackageInvoiceApproval({
      packageId: input.packageId,
      invoiceId: invoice.id,
      submittedBy: admin.email,
    });
  }

  async function rollbackCreatedPackage() {
    if (createdInvoiceId) {
      await deleteParentInvoice({ invoiceId: createdInvoiceId, actorEmail: admin.email }).catch(() => null);
      if (createdInvoiceMonthKey) {
        await resequenceGlobalInvoiceNumbersForMonth(createdInvoiceMonthKey).catch(() => null);
      }
    }
    if (createdPackageId) {
      await prisma.packageTxn.deleteMany({ where: { packageId: createdPackageId } }).catch(() => null);
      await prisma.coursePackage.delete({ where: { id: createdPackageId } }).catch(() => null);
    }
  }

  if (type === "HOURS") {
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return bad("HOURS package needs totalMinutes", 409);
    let purchaseBatches;
    try {
      purchaseBatches = normalizePurchaseBatches({
        batchesRaw: body?.purchaseBatches,
        fallbackMinutes: totalMinutes,
        fallbackNote: packageNote || null,
      });
    } catch (error) {
      return bad(error instanceof Error ? error.message : "Invalid purchase batches", 409);
    }
    const effectiveTotalMinutes = sumPurchaseBatchMinutes(purchaseBatches);

    try {
      const created = await prisma.coursePackage.create({
        data: {
          studentId,
          courseId,
          type: "HOURS",
          status: (status as any) || "PAUSED",
          settlementMode: settlementMode as any,
          ...createFinanceGateData(null),
          totalMinutes: effectiveTotalMinutes,
          remainingMinutes: effectiveTotalMinutes,
          validFrom,
          validTo,
          paid,
          paidAt,
          paidAmount,
          paidNote: paidNote || null,
          note: packageNote || null,
          sharedStudents: sharedStudentIds.length
            ? { createMany: { data: sharedStudentIds.map((sharedStudentId) => ({ studentId: sharedStudentId })) } }
            : undefined,
          sharedCourses: sharedCourseIds.length
            ? { createMany: { data: sharedCourseIds.map((sharedCourseId) => ({ courseId: sharedCourseId })) } }
            : undefined,
          txns: {
            create: buildPurchaseTxnCreates({
              batches: purchaseBatches,
              totalAmount: paidAmount,
              defaultNote: packageNote || null,
              prefix: "Initial purchase",
            }),
          },
        },
        include: {
          student: { select: { name: true } },
          course: { select: { name: true } },
        },
      });
      createdPackageId = created.id;
      await finalizeDirectBillingGate({
        packageId: created.id,
        studentName: created.student.name,
        courseName: created.course.name,
        totalMinutesForDescription: effectiveTotalMinutes,
      });
      return Response.json(
        { ok: true, id: created.id, financeGateStatus: requiresInvoiceGate ? "INVOICE_PENDING_MANAGER" : "EXEMPT" },
        { status: 201 }
      );
    } catch (error) {
      await rollbackCreatedPackage();
      return bad(error instanceof Error ? error.message : "Create package failed", 409);
    }
  }

  if (type !== "MONTHLY") return bad("Invalid type", 409);

  try {
    const created = await prisma.coursePackage.create({
      data: {
        studentId,
        courseId,
        type: "MONTHLY",
        status: (status as any) || "PAUSED",
        settlementMode: settlementMode as any,
        ...createFinanceGateData(null),
        validFrom,
        validTo,
        paid,
        paidAt,
        paidAmount,
        paidNote: paidNote || null,
        note: packageNote || null,
        sharedStudents: sharedStudentIds.length
          ? { createMany: { data: sharedStudentIds.map((sharedStudentId) => ({ studentId: sharedStudentId })) } }
          : undefined,
        sharedCourses: sharedCourseIds.length
          ? { createMany: { data: sharedCourseIds.map((sharedCourseId) => ({ courseId: sharedCourseId })) } }
          : undefined,
        txns: {
          create: {
            kind: "PURCHASE",
            deltaMinutes: 0,
            deltaAmount: paidAmount,
            note: packageNote || null,
          },
        },
      },
      include: {
        student: { select: { name: true } },
        course: { select: { name: true } },
      },
    });
    createdPackageId = created.id;
    await finalizeDirectBillingGate({
      packageId: created.id,
      studentName: created.student.name,
      courseName: created.course.name,
      totalMinutesForDescription: null,
    });
    return Response.json(
      { ok: true, id: created.id, financeGateStatus: requiresInvoiceGate ? "INVOICE_PENDING_MANAGER" : "EXEMPT" },
      { status: 201 }
    );
  } catch (error) {
    await rollbackCreatedPackage();
    return bad(error instanceof Error ? error.message : "Create package failed", 409);
  }
}
