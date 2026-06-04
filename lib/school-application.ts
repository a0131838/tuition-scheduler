import crypto from "crypto";
import { Prisma, SchoolApplicationEventType, SchoolApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BUSINESS_UPLOAD_PREFIX, storeBusinessBuffer } from "@/lib/business-file-storage";
import { formatDateOnly, normalizeDateOnly } from "@/lib/date-only";
import { assertGlobalInvoiceNoAvailable, getNextGlobalInvoiceNo } from "@/lib/global-invoice-sequence";
import { createParentInvoice } from "@/lib/student-parent-billing";
import { getSchoolApplicationTarget, inferSchoolApplicationEquivalentLevel } from "@/lib/school-application-directory";
import {
  generateSignedSchoolApplicationPdfBuffer,
  generateUnsignedSchoolApplicationPdfBuffer,
  type SchoolApplicationSnapshot,
  type SchoolApplicationSnapshotItem,
} from "@/lib/school-application-pdf";

const DEFAULT_SIGN_TTL_DAYS = 14;
const INVOICE_MARKER_PREFIX = "school-application:";

const includeApplication = {
  student: true,
  package: {
    include: {
      course: true,
    },
  },
} satisfies Prisma.SchoolApplicationServiceInclude;

type Row = Prisma.SchoolApplicationServiceGetPayload<{ include: typeof includeApplication }>;

export type SchoolApplicationItem = {
  targetId?: string | null;
  schoolName: string;
  programme?: string | null;
  grade?: string | null;
  equivalentLevel?: string | null;
  intake?: string | null;
  serviceFee?: number | null;
  officialFee?: number | null;
  officialFeeMode?: string | null;
  notes?: string | null;
};

export type SchoolApplicationParentInfo = {
  parentName: string;
  parentIdNo?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export type SchoolApplicationSummary = {
  id: string;
  studentId: string;
  packageId: string | null;
  status: SchoolApplicationStatus;
  signToken: string | null;
  signExpiresAt: Date | null;
  signViewedAt: Date | null;
  signedAt: Date | null;
  invoiceCreatedAt: Date | null;
  voidedAt: Date | null;
  parentInfo: SchoolApplicationParentInfo | null;
  items: SchoolApplicationItem[];
  serviceHours: number | null;
  serviceFeeAmount: number;
  officialFeeAmount: number;
  addOnFeeAmount: number;
  totalAmount: number;
  billTo: string;
  agreementDate: Date;
  note: string | null;
  contractSnapshot: SchoolApplicationSnapshot | null;
  signedPdfPath: string | null;
  signerName: string | null;
  signerEmail: string | null;
  signerPhone: string | null;
  signerIp: string | null;
  invoiceId: string | null;
  invoiceNo: string | null;
  studentName: string;
  packageLabel: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function token() {
  return crypto.randomBytes(24).toString("hex");
}

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function trimOrNull(value: unknown) {
  const normalized = trim(value);
  return normalized || null;
}

function money(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0);
}

function coerceItems(value: unknown): SchoolApplicationItem[] {
  const raw = Array.isArray(value) ? value : [];
  return raw
    .map((item) => {
      const targetId = trimOrNull((item as any)?.targetId);
      const target = getSchoolApplicationTarget(targetId);
      return {
        targetId,
        schoolName: target?.name ?? trim((item as any)?.schoolName),
        programme: trimOrNull((item as any)?.programme) ?? target?.programmes[0] ?? null,
        grade: trimOrNull((item as any)?.grade),
        equivalentLevel: trimOrNull((item as any)?.equivalentLevel) ?? inferSchoolApplicationEquivalentLevel(trimOrNull((item as any)?.grade)),
        intake: trimOrNull((item as any)?.intake) ?? target?.intakes[0] ?? null,
        serviceFee: money((item as any)?.serviceFee),
        officialFee: money((item as any)?.officialFee) || money(target?.officialFee),
        officialFeeMode: trimOrNull((item as any)?.officialFeeMode) ?? target?.officialFeeMode ?? null,
        notes: trimOrNull((item as any)?.notes) ?? target?.note ?? null,
      };
    })
    .filter((item) => item.schoolName);
}

function coerceParentInfo(value: unknown): SchoolApplicationParentInfo | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const parentName = trim((value as any).parentName);
  if (!parentName) return null;
  return {
    parentName,
    parentIdNo: trimOrNull((value as any).parentIdNo),
    phone: trimOrNull((value as any).phone),
    email: trimOrNull((value as any).email),
    address: trimOrNull((value as any).address),
  };
}

function summarize(row: Row): SchoolApplicationSummary {
  return {
    id: row.id,
    studentId: row.studentId,
    packageId: row.packageId,
    status: row.status,
    signToken: row.signToken,
    signExpiresAt: row.signExpiresAt,
    signViewedAt: row.signViewedAt,
    signedAt: row.signedAt,
    invoiceCreatedAt: row.invoiceCreatedAt,
    voidedAt: row.voidedAt,
    parentInfo: coerceParentInfo(row.parentInfoJson),
    items: coerceItems(row.applicationItemsJson),
    serviceHours: row.serviceHours == null ? null : Number(row.serviceHours),
    serviceFeeAmount: decimalToNumber(row.serviceFeeAmount),
    officialFeeAmount: decimalToNumber(row.officialFeeAmount),
    addOnFeeAmount: decimalToNumber(row.addOnFeeAmount),
    totalAmount: decimalToNumber(row.totalAmount),
    billTo: row.billTo,
    agreementDate: row.agreementDate,
    note: row.note,
    contractSnapshot:
      row.contractSnapshotJson && typeof row.contractSnapshotJson === "object" && !Array.isArray(row.contractSnapshotJson)
        ? (row.contractSnapshotJson as unknown as SchoolApplicationSnapshot)
        : null,
    signedPdfPath: row.signedPdfPath,
    signerName: row.signerName,
    signerEmail: row.signerEmail,
    signerPhone: row.signerPhone,
    signerIp: row.signerIp,
    invoiceId: row.invoiceId,
    invoiceNo: row.invoiceNo,
    studentName: row.student.name,
    packageLabel: row.package ? `${row.package.course.name} · ${row.package.type}` : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function refundPolicyLabel(schoolCount: number) {
  if (schoolCount >= 4) {
    return "4-5 schools / 1 pax: 50% refund only if all applications fail; no refund for any successful offer.";
  }
  return "1-3 schools / 1 pax: no refund.";
}

async function event(input: {
  applicationId: string;
  eventType: SchoolApplicationEventType;
  actorUserId?: string | null;
  actorLabel?: string | null;
  payloadJson?: Prisma.JsonValue;
}) {
  await prisma.schoolApplicationEvent.create({
    data: {
      applicationId: input.applicationId,
      eventType: input.eventType,
      actorType: input.actorUserId ? "ADMIN" : "SYSTEM",
      actorUserId: input.actorUserId ?? null,
      actorLabel: input.actorLabel ?? null,
      payloadJson: input.payloadJson ?? Prisma.JsonNull,
    },
  });
}

export function buildSchoolApplicationSignPath(signToken: string) {
  return `/school-application/${encodeURIComponent(signToken)}`;
}

export async function listSchoolApplicationsForStudent(studentId: string) {
  const rows = await prisma.schoolApplicationService.findMany({
    where: { studentId },
    include: includeApplication,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return rows.map(summarize);
}

export async function getSchoolApplicationById(id: string) {
  const row = await prisma.schoolApplicationService.findUnique({
    where: { id },
    include: includeApplication,
  });
  return row ? summarize(row) : null;
}

export async function getSchoolApplicationBySignToken(signToken: string) {
  const row = await prisma.schoolApplicationService.findUnique({
    where: { signToken },
    include: includeApplication,
  });
  return row ? summarize(row) : null;
}

export async function markSchoolApplicationSignViewed(id: string) {
  const row = await prisma.schoolApplicationService.findUnique({ where: { id }, select: { signViewedAt: true } });
  if (!row || row.signViewedAt) return;
  await prisma.schoolApplicationService.update({ where: { id }, data: { signViewedAt: new Date() } });
  await event({ applicationId: id, eventType: SchoolApplicationEventType.SIGN_VIEWED, actorLabel: "Parent viewed sign link" });
}

export async function createSchoolApplicationDraft(input: {
  studentId: string;
  packageId?: string | null;
  createdByUserId?: string | null;
}) {
  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: { id: true, name: true },
  });
  if (!student) throw new Error("Student not found");
  const packageId = await ensureServiceBillingPackage(student.id);
  const row = await prisma.schoolApplicationService.create({
    data: {
      studentId: student.id,
      packageId,
      status: SchoolApplicationStatus.DRAFT,
      applicationItemsJson: [],
      billTo: student.name,
      agreementDate: new Date(),
      parentInfoJson: {
        parentName: "",
        phone: null,
        email: null,
        address: null,
      },
      createdByUserId: input.createdByUserId ?? null,
    },
    include: includeApplication,
  });
  await event({
    applicationId: row.id,
    eventType: SchoolApplicationEventType.GENERATED,
    actorUserId: input.createdByUserId ?? null,
    actorLabel: "Created school application service draft",
  });
  return summarize(row);
}

export async function saveSchoolApplicationDraft(input: {
  id: string;
  packageId?: string | null;
  parentInfo: SchoolApplicationParentInfo;
  items: SchoolApplicationItem[];
  serviceHours?: number | null;
  addOnFeeAmount?: number | null;
  billTo: string;
  agreementDate: string;
  note?: string | null;
  actorUserId?: string | null;
}) {
  const current = await prisma.schoolApplicationService.findUnique({ where: { id: input.id } });
  if (!current) throw new Error("School application not found");
  if (current.status === SchoolApplicationStatus.SIGNED || current.status === SchoolApplicationStatus.INVOICE_CREATED) {
    throw new Error("Signed school application cannot be edited");
  }
  const items = coerceItems(input.items);
  if (items.length < 1 || items.length > 5) throw new Error("School application must include 1 to 5 schools");
  const parentInfo = coerceParentInfo(input.parentInfo);
  if (!parentInfo) throw new Error("Parent name is required");
  const serviceFeeAmount = money(items.reduce((sum, item) => sum + money(item.serviceFee), 0));
  const officialFeeAmount = money(items.reduce((sum, item) => sum + money(item.officialFee), 0));
  const addOnFeeAmount = money(input.addOnFeeAmount);
  const totalAmount = money(serviceFeeAmount + officialFeeAmount + addOnFeeAmount);
  if (totalAmount <= 0) throw new Error("Total amount must be greater than 0");
  const agreementDate = normalizeDateOnly(input.agreementDate, new Date()) ?? formatDateOnly(new Date());
  const packageId = await ensureServiceBillingPackage(current.studentId);
  const row = await prisma.schoolApplicationService.update({
    where: { id: input.id },
    data: {
      packageId,
      parentInfoJson: parentInfo as unknown as Prisma.InputJsonValue,
      applicationItemsJson: items as unknown as Prisma.InputJsonValue,
      serviceHours: input.serviceHours == null ? null : new Prisma.Decimal(money(input.serviceHours)),
      serviceFeeAmount: new Prisma.Decimal(serviceFeeAmount),
      officialFeeAmount: new Prisma.Decimal(officialFeeAmount),
      addOnFeeAmount: new Prisma.Decimal(addOnFeeAmount),
      totalAmount: new Prisma.Decimal(totalAmount),
      billTo: trim(input.billTo) || parentInfo.parentName,
      agreementDate: new Date(`${agreementDate}T00:00:00+08:00`),
      note: trimOrNull(input.note),
    },
    include: includeApplication,
  });
  await event({
    applicationId: row.id,
    eventType: SchoolApplicationEventType.DRAFT_SAVED,
    actorUserId: input.actorUserId ?? null,
    actorLabel: "Saved school application service draft",
    payloadJson: { schoolCount: items.length, totalAmount },
  });
  return summarize(row);
}

function snapshotFromSummary(app: SchoolApplicationSummary): SchoolApplicationSnapshot {
  const parentInfo = app.parentInfo;
  if (!parentInfo) throw new Error("Parent information is required before signing");
  if (app.items.length < 1 || app.items.length > 5) throw new Error("School application must include 1 to 5 schools");
  const items: SchoolApplicationSnapshotItem[] = app.items.map((item) => ({
    schoolName: item.schoolName,
    programme: item.programme ?? null,
    grade: item.grade ?? null,
    equivalentLevel: item.equivalentLevel ?? inferSchoolApplicationEquivalentLevel(item.grade),
    intake: item.intake ?? null,
    serviceFee: money(item.serviceFee),
    officialFee: money(item.officialFee),
    officialFeeMode: item.officialFeeMode ?? null,
    notes: item.notes ?? null,
  }));
  return {
    applicationId: app.id,
    generatedAtIso: new Date().toISOString(),
    agreementDate: formatDateOnly(app.agreementDate),
    agencyName: "GT Educational Institute Pte Ltd",
    agencyDetails: "UEN 202303312G · 150 Orchard Road, Orchard Plaza, #08-15/16, Singapore 238841",
    parentName: parentInfo.parentName,
    parentIdNo: parentInfo.parentIdNo ?? null,
    parentPhone: parentInfo.phone ?? null,
    parentEmail: parentInfo.email ?? null,
    parentAddress: parentInfo.address ?? null,
    studentName: app.studentName,
    studentGrade: null,
    studentSchool: null,
    items,
    serviceHours: app.serviceHours,
    serviceFeeAmount: app.serviceFeeAmount,
    officialFeeAmount: app.officialFeeAmount,
    addOnFeeAmount: app.addOnFeeAmount,
    totalAmount: app.totalAmount,
    billTo: app.billTo,
    note: app.note,
    refundPolicyLabel: refundPolicyLabel(items.length),
  };
}

async function ensureServiceBillingPackage(studentId: string) {
  const existing = await prisma.coursePackage.findFirst({
    where: {
      studentId,
      note: { contains: "SERVICE_BILLING_CASE:SCHOOL_APPLICATION" },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (existing) return existing.id;

  const course =
    (await prisma.course.findFirst({ where: { name: "School Application Service" } })) ??
    (await prisma.course.create({ data: { name: "School Application Service" } }));
  const pkg = await prisma.coursePackage.create({
    data: {
      studentId,
      courseId: course.id,
      type: "HOURS",
      status: "PAUSED",
      financeGateStatus: "EXEMPT",
      financeGateReason: "Service billing case for school application. Not used for lesson scheduling or balance deduction.",
      financeGateUpdatedAt: new Date(),
      financeGateUpdatedBy: "system.school-application",
      totalMinutes: 0,
      remainingMinutes: 0,
      validFrom: new Date(),
      paid: false,
      note: "SERVICE_BILLING_CASE:SCHOOL_APPLICATION. For invoice and receipt workflow only; not a lesson package.",
    },
  });
  return pkg.id;
}

export async function prepareSchoolApplicationSignLink(input: {
  id: string;
  actorUserId?: string | null;
}) {
  const app = await getSchoolApplicationById(input.id);
  if (!app) throw new Error("School application not found");
  if (app.status === SchoolApplicationStatus.SIGNED || app.status === SchoolApplicationStatus.INVOICE_CREATED) {
    throw new Error("School application is already signed");
  }
  const snapshot = snapshotFromSummary(app);
  const unsignedPdf = await generateUnsignedSchoolApplicationPdfBuffer(snapshot);
  await storeBusinessBuffer(
    { content: unsignedPdf, originalName: `school-application-${app.id}.pdf` },
    { allowedPrefix: BUSINESS_UPLOAD_PREFIX.contracts, subdirSegments: ["school-applications", app.id] }
  );
  const row = await prisma.schoolApplicationService.update({
    where: { id: app.id },
    data: {
      status: SchoolApplicationStatus.READY_TO_SIGN,
      signToken: app.signToken ?? token(),
      signExpiresAt: addDays(new Date(), DEFAULT_SIGN_TTL_DAYS),
      contractSnapshotJson: snapshot as unknown as Prisma.InputJsonValue,
    },
    include: includeApplication,
  });
  await event({
    applicationId: app.id,
    eventType: SchoolApplicationEventType.SIGN_READY,
    actorUserId: input.actorUserId ?? null,
    actorLabel: "Prepared school application service sign link",
  });
  return summarize(row);
}

async function ensureInvoiceForSignedApplication(row: SchoolApplicationSummary, snapshot: SchoolApplicationSnapshot) {
  if (row.invoiceId && row.invoiceNo) {
    return { invoiceId: row.invoiceId, invoiceNo: row.invoiceNo, createdAt: row.invoiceCreatedAt ?? new Date() };
  }
  const packageId = row.packageId ?? (await ensureServiceBillingPackage(row.studentId));
  const issueDate = normalizeDateOnly(snapshot.agreementDate, new Date()) ?? formatDateOnly(new Date());
  const invoiceNo = await getNextGlobalInvoiceNo(issueDate);
  await assertGlobalInvoiceNoAvailable(invoiceNo);
  const schoolLabel = snapshot.items.map((item) => item.schoolName).join(", ");
  const invoice = await createParentInvoice({
    packageId,
    studentId: row.studentId,
    invoiceNo,
    issueDate,
    dueDate: issueDate,
    courseStartDate: issueDate,
    courseEndDate: null,
    billTo: snapshot.billTo,
    quantity: 1,
    description: `School application service for ${snapshot.studentName}: ${schoolLabel}`,
    amount: snapshot.totalAmount,
    gstAmount: 0,
    totalAmount: snapshot.totalAmount,
    paymentTerms: "Immediate",
    note: `Auto-created from signed school application service ${row.id}. ${INVOICE_MARKER_PREFIX}${row.id}`,
    createdBy: "system.school-application@sgtmanage.local",
  });
  if (!row.packageId) {
    await prisma.schoolApplicationService.update({
      where: { id: row.id },
      data: { packageId },
    });
  }
  return { invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, createdAt: new Date(invoice.createdAt) };
}

export async function signSchoolApplication(input: {
  signToken: string;
  signerName: string;
  signerEmail?: string | null;
  signerPhone?: string | null;
  signerIp?: string | null;
}) {
  const app = await getSchoolApplicationBySignToken(input.signToken);
  if (!app) throw new Error("School application sign link not found");
  if (app.status !== SchoolApplicationStatus.READY_TO_SIGN || !app.contractSnapshot) {
    throw new Error("School application is not ready to sign");
  }
  if (app.signExpiresAt && app.signExpiresAt.getTime() < Date.now()) {
    throw new Error("School application sign link has expired");
  }
  const signerName = trim(input.signerName);
  if (!signerName) throw new Error("Signer name is required");
  const now = new Date();
  const invoice = await ensureInvoiceForSignedApplication(app, app.contractSnapshot);
  const signedPdf = await generateSignedSchoolApplicationPdfBuffer({
    snapshot: app.contractSnapshot,
    signerName,
    signedAtLabel: now.toLocaleString("en-SG"),
    signerIp: input.signerIp ?? null,
  });
  const stored = await storeBusinessBuffer(
    { content: signedPdf, originalName: `signed-school-application-${app.id}.pdf` },
    { allowedPrefix: BUSINESS_UPLOAD_PREFIX.contracts, subdirSegments: ["school-applications", app.id] }
  );
  const row = await prisma.schoolApplicationService.update({
    where: { id: app.id },
    data: {
      status: SchoolApplicationStatus.INVOICE_CREATED,
      signedAt: now,
      invoiceCreatedAt: invoice.createdAt,
      signerName,
      signerEmail: trimOrNull(input.signerEmail),
      signerPhone: trimOrNull(input.signerPhone),
      signerIp: trimOrNull(input.signerIp),
      signedPdfPath: stored.relativePath,
      invoiceId: invoice.invoiceId,
      invoiceNo: invoice.invoiceNo,
    },
    include: includeApplication,
  });
  await event({
    applicationId: app.id,
    eventType: SchoolApplicationEventType.SIGNED,
    actorLabel: "Parent signed school application service agreement",
    payloadJson: { signerName, invoiceNo: invoice.invoiceNo },
  });
  await event({
    applicationId: app.id,
    eventType: SchoolApplicationEventType.INVOICE_CREATED,
    actorLabel: "School application invoice created",
    payloadJson: { invoiceId: invoice.invoiceId, invoiceNo: invoice.invoiceNo },
  });
  return summarize(row);
}

export async function voidSchoolApplication(input: {
  id: string;
  reason?: string | null;
  actorUserId?: string | null;
}) {
  const row = await prisma.schoolApplicationService.findUnique({
    where: { id: input.id },
    include: includeApplication,
  });
  if (!row) throw new Error("School application not found");
  if (row.status === SchoolApplicationStatus.VOID) throw new Error("School application is already voided");
  const reason = trimOrNull(input.reason);
  if ((row.status === SchoolApplicationStatus.SIGNED || row.status === SchoolApplicationStatus.INVOICE_CREATED) && !reason) {
    throw new Error("Voiding a signed school application requires a reason");
  }
  const next = await prisma.schoolApplicationService.update({
    where: { id: row.id },
    data: { status: SchoolApplicationStatus.VOID, voidedAt: new Date() },
    include: includeApplication,
  });
  await event({
    applicationId: row.id,
    eventType: SchoolApplicationEventType.VOIDED,
    actorUserId: input.actorUserId ?? null,
    actorLabel: "Voided school application service",
    payloadJson: { reason, invoiceId: row.invoiceId, invoiceNo: row.invoiceNo },
  });
  return summarize(next);
}

export async function deleteVoidedSchoolApplication(input: {
  id: string;
  actorUserId?: string | null;
}) {
  const row = await prisma.schoolApplicationService.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, invoiceId: true, invoiceNo: true },
  });
  if (!row) throw new Error("School application not found");
  if (row.status !== SchoolApplicationStatus.VOID) {
    throw new Error("Only voided school application records can be deleted");
  }
  if (row.invoiceId || row.invoiceNo) {
    throw new Error("Voided school application is linked to an invoice and must be kept for audit history");
  }
  await prisma.schoolApplicationService.delete({ where: { id: row.id } });
  return { deleted: true };
}

export async function generateSchoolApplicationPdfBuffer(id: string, options: { companySeal?: boolean } = {}) {
  const app = await getSchoolApplicationById(id);
  if (!app) throw new Error("School application not found");
  const snapshot = app.contractSnapshot ?? snapshotFromSummary(app);
  if (app.signedAt) {
    return generateSignedSchoolApplicationPdfBuffer({
      snapshot,
      signerName: app.signerName ?? snapshot.parentName,
      signedAtLabel: app.signedAt.toLocaleString("en-SG"),
      signerIp: app.signerIp,
      companySeal: options.companySeal,
    });
  }
  return generateUnsignedSchoolApplicationPdfBuffer(snapshot);
}
