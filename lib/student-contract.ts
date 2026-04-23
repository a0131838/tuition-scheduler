import crypto from "crypto";
import { Prisma, StudentContractEventType, StudentContractStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type ContractParentInfo,
  type ContractSnapshot,
  buildStudentContractSnapshot,
  getDefaultStudentContractTemplateInput,
} from "@/lib/student-contract-template";
import {
  BUSINESS_UPLOAD_PREFIX,
  storeBusinessBuffer,
} from "@/lib/business-file-storage";
import {
  generateSignedStudentContractPdfBuffer,
  generateUnsignedStudentContractPdfBuffer,
} from "@/lib/student-contract-pdf";
import { isPartnerSettlementPackage } from "@/lib/package-finance-gate";

const DEFAULT_TOKEN_TTL_DAYS = 14;

const studentContractInclude = {
  template: true,
  student: {
    select: {
      id: true,
      name: true,
    },
  },
  package: {
    include: {
      course: true,
    },
  },
} satisfies Prisma.StudentContractInclude;

type StudentContractRow = Prisma.StudentContractGetPayload<{
  include: typeof studentContractInclude;
}>;

export type StudentContractSummary = {
  id: string;
  studentId: string;
  packageId: string;
  templateId: string;
  status: StudentContractStatus;
  intakeToken: string;
  signToken: string | null;
  intakeExpiresAt: Date | null;
  signExpiresAt: Date | null;
  intakeSubmittedAt: Date | null;
  signViewedAt: Date | null;
  signedAt: Date | null;
  voidedAt: Date | null;
  parentInfo: ContractParentInfo | null;
  contractSnapshot: ContractSnapshot | null;
  signedPdfPath: string | null;
  signatureImagePath: string | null;
  signerName: string | null;
  signerEmail: string | null;
  signerPhone: string | null;
  signerIp: string | null;
  studentName: string;
  packageLabel: string;
  courseName: string;
  createdAt: Date;
  updatedAt: Date;
};

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function createStudentContractToken() {
  return crypto.randomBytes(24).toString("hex");
}

function trimOrNull(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function coerceString(value: unknown) {
  return String(value ?? "").trim();
}

export function buildStudentContractIntakePath(token: string) {
  return `/contract-intake/${encodeURIComponent(token)}`;
}

export function buildStudentContractSignPath(token: string) {
  return `/contract/${encodeURIComponent(token)}`;
}

export function studentContractStatusLabel(status: StudentContractStatus) {
  switch (status) {
    case StudentContractStatus.INFO_PENDING:
      return "Info pending";
    case StudentContractStatus.INFO_SUBMITTED:
      return "Info submitted";
    case StudentContractStatus.READY_TO_SIGN:
      return "Ready to sign";
    case StudentContractStatus.SIGNED:
      return "Signed";
    case StudentContractStatus.EXPIRED:
      return "Expired";
    case StudentContractStatus.VOID:
      return "Void";
    default:
      return "Draft";
  }
}

export function studentContractStatusLabelZh(status: StudentContractStatus) {
  switch (status) {
    case StudentContractStatus.INFO_PENDING:
      return "待家长填写";
    case StudentContractStatus.INFO_SUBMITTED:
      return "资料已提交";
    case StudentContractStatus.READY_TO_SIGN:
      return "待正式签字";
    case StudentContractStatus.SIGNED:
      return "已签署";
    case StudentContractStatus.EXPIRED:
      return "已过期";
    case StudentContractStatus.VOID:
      return "已作废";
    default:
      return "草稿";
  }
}

function coerceParentInfo(raw: unknown): ContractParentInfo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const parentFullNameEn = coerceString(row.parentFullNameEn);
  const phone = coerceString(row.phone);
  const email = coerceString(row.email);
  const address = coerceString(row.address);
  const relationshipToStudent = coerceString(row.relationshipToStudent);
  if (!parentFullNameEn || !phone || !email || !address || !relationshipToStudent) return null;
  return {
    parentFullNameEn,
    parentFullNameZh: trimOrNull(row.parentFullNameZh),
    phone,
    email,
    address,
    relationshipToStudent,
    isLegalGuardian: Boolean(row.isLegalGuardian),
    emergencyContactName: trimOrNull(row.emergencyContactName),
    emergencyContactPhone: trimOrNull(row.emergencyContactPhone),
  };
}

function coerceSnapshot(raw: unknown): ContractSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.agreementHtml !== "string") return null;
  return row as unknown as ContractSnapshot;
}

function summarize(row: StudentContractRow): StudentContractSummary {
  return {
    id: row.id,
    studentId: row.studentId,
    packageId: row.packageId,
    templateId: row.templateId,
    status: row.status,
    intakeToken: row.intakeToken,
    signToken: row.signToken ?? null,
    intakeExpiresAt: row.intakeExpiresAt ?? null,
    signExpiresAt: row.signExpiresAt ?? null,
    intakeSubmittedAt: row.intakeSubmittedAt ?? null,
    signViewedAt: row.signViewedAt ?? null,
    signedAt: row.signedAt ?? null,
    voidedAt: row.voidedAt ?? null,
    parentInfo: coerceParentInfo(row.parentInfoJson),
    contractSnapshot: coerceSnapshot(row.contractSnapshotJson),
    signedPdfPath: row.signedPdfPath ?? null,
    signatureImagePath: row.signatureImagePath ?? null,
    signerName: row.signerName ?? null,
    signerEmail: row.signerEmail ?? null,
    signerPhone: row.signerPhone ?? null,
    signerIp: row.signerIp ?? null,
    studentName: row.student.name,
    packageLabel: row.package.type,
    courseName: row.package.course.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function assertDirectBillingPackage(pkg: {
  id: string;
  settlementMode: Prisma.JsonValue | string | null;
}) {
  if (isPartnerSettlementPackage((pkg.settlementMode as never) ?? null)) {
    throw new Error("Partner settlement packages do not use the student contract flow");
  }
}

async function ensureDefaultContractTemplate() {
  const template = getDefaultStudentContractTemplateInput();
  return prisma.contractTemplate.upsert({
    where: {
      slug_version: {
        slug: template.slug,
        version: template.version,
      },
    },
    update: {
      name: template.name,
      languageMode: template.languageMode,
      bodyHtml: template.bodyHtml,
      isActive: true,
    },
    create: {
      name: template.name,
      slug: template.slug,
      version: template.version,
      languageMode: template.languageMode,
      bodyHtml: template.bodyHtml,
      isActive: true,
    },
  });
}

export async function appendStudentContractEvent(input: {
  contractId: string;
  eventType: StudentContractEventType;
  actorType: "ADMIN" | "PARENT" | "SYSTEM";
  actorUserId?: string | null;
  actorLabel?: string | null;
  payloadJson?: Prisma.JsonValue;
}) {
  await prisma.studentContractEvent.create({
    data: {
      contractId: input.contractId,
      eventType: input.eventType,
      actorType: input.actorType,
      actorUserId: input.actorUserId ?? null,
      actorLabel: trimOrNull(input.actorLabel),
      payloadJson: input.payloadJson ?? Prisma.JsonNull,
    },
  });
}

async function getContractRow(where: Prisma.StudentContractWhereUniqueInput) {
  const row = await prisma.studentContract.findUnique({
    where,
    include: studentContractInclude,
  });
  return row;
}

export async function getStudentContractById(id: string) {
  const row = await getContractRow({ id });
  return row ? summarize(row) : null;
}

export async function getLatestStudentContractForPackage(packageId: string) {
  const row = await prisma.studentContract.findFirst({
    where: { packageId },
    include: studentContractInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return row ? summarize(row) : null;
}

export async function listStudentContractsForStudent(studentId: string) {
  const rows = await prisma.studentContract.findMany({
    where: { studentId },
    include: studentContractInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 30,
  });
  return rows.map(summarize);
}

export async function createStudentContractDraft(input: {
  studentId: string;
  packageId: string;
  templateSlug?: string;
  createdByUserId?: string | null;
  intakeExpiresAt?: Date | null;
}) {
  const existing = await prisma.studentContract.findFirst({
    where: {
      packageId: input.packageId,
      status: {
        in: [
          StudentContractStatus.INFO_PENDING,
          StudentContractStatus.INFO_SUBMITTED,
          StudentContractStatus.READY_TO_SIGN,
          StudentContractStatus.SIGNED,
        ],
      },
    },
    include: studentContractInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (existing) return summarize(existing);

  const [pkg, template] = await Promise.all([
    prisma.coursePackage.findUnique({
      where: { id: input.packageId },
      include: { student: true, course: true },
    }),
    ensureDefaultContractTemplate(),
  ]);
  if (!pkg || pkg.studentId !== input.studentId) {
    throw new Error("Package not found for this student");
  }
  assertDirectBillingPackage(pkg);

  const row = await prisma.studentContract.create({
    data: {
      studentId: input.studentId,
      packageId: input.packageId,
      templateId: template.id,
      status: StudentContractStatus.INFO_PENDING,
      intakeToken: createStudentContractToken(),
      intakeExpiresAt: input.intakeExpiresAt ?? addDays(new Date(), DEFAULT_TOKEN_TTL_DAYS),
      createdByUserId: input.createdByUserId ?? null,
    },
    include: studentContractInclude,
  });
  await appendStudentContractEvent({
    contractId: row.id,
    eventType: StudentContractEventType.GENERATED,
    actorType: input.createdByUserId ? "ADMIN" : "SYSTEM",
    actorUserId: input.createdByUserId ?? null,
    actorLabel: input.createdByUserId ? "Created draft" : "System generated draft",
  });
  return summarize(row);
}

export async function refreshStudentContractIntakeLink(input: {
  contractId: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
  expiresAt?: Date | null;
}) {
  const row = await getContractRow({ id: input.contractId });
  if (!row) throw new Error("Contract not found");
  if (row.status === StudentContractStatus.SIGNED || row.status === StudentContractStatus.VOID) {
    throw new Error("Signed or void contracts cannot be resent for intake");
  }
  const next = await prisma.studentContract.update({
    where: { id: row.id },
    data: {
      status:
        row.status === StudentContractStatus.EXPIRED ? StudentContractStatus.INFO_PENDING : row.status,
      intakeToken: createStudentContractToken(),
      intakeExpiresAt: input.expiresAt ?? addDays(new Date(), DEFAULT_TOKEN_TTL_DAYS),
      signToken: row.status === StudentContractStatus.READY_TO_SIGN ? row.signToken : null,
      signExpiresAt: row.status === StudentContractStatus.READY_TO_SIGN ? row.signExpiresAt : null,
    },
    include: studentContractInclude,
  });
  await appendStudentContractEvent({
    contractId: row.id,
    eventType: StudentContractEventType.INTAKE_SENT,
    actorType: input.actorUserId ? "ADMIN" : "SYSTEM",
    actorUserId: input.actorUserId ?? null,
    actorLabel: input.actorLabel ?? "Resent intake link",
  });
  return summarize(next);
}

export async function refreshStudentContractSignLink(input: {
  contractId: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
  expiresAt?: Date | null;
}) {
  const row = await getContractRow({ id: input.contractId });
  if (!row) throw new Error("Contract not found");
  if (row.status === StudentContractStatus.SIGNED || row.status === StudentContractStatus.VOID) {
    throw new Error("Signed or void contracts cannot be resent for signing");
  }
  if (row.status !== StudentContractStatus.READY_TO_SIGN) {
    throw new Error("Contract must complete intake before signing");
  }
  const next = await prisma.studentContract.update({
    where: { id: row.id },
    data: {
      signToken: createStudentContractToken(),
      signExpiresAt: input.expiresAt ?? addDays(new Date(), DEFAULT_TOKEN_TTL_DAYS),
    },
    include: studentContractInclude,
  });
  await appendStudentContractEvent({
    contractId: row.id,
    eventType: StudentContractEventType.SIGN_LINK_SENT,
    actorType: input.actorUserId ? "ADMIN" : "SYSTEM",
    actorUserId: input.actorUserId ?? null,
    actorLabel: input.actorLabel ?? "Resent sign link",
  });
  return summarize(next);
}

async function expireContractIfNeeded(row: StudentContractRow) {
  const expiresAt =
    row.status === StudentContractStatus.READY_TO_SIGN ? row.signExpiresAt : row.intakeExpiresAt;
  if (!expiresAt || expiresAt.getTime() >= Date.now()) return row;
  if (row.status === StudentContractStatus.SIGNED || row.status === StudentContractStatus.VOID) return row;
  const next = await prisma.studentContract.update({
    where: { id: row.id },
    data: {
      status: StudentContractStatus.EXPIRED,
    },
    include: studentContractInclude,
  });
  await appendStudentContractEvent({
    contractId: row.id,
    eventType: StudentContractEventType.EXPIRED,
    actorType: "SYSTEM",
    actorLabel: "Token expired",
  });
  return next;
}

export async function getStudentContractByIntakeToken(token: string) {
  const row = await getContractRow({ intakeToken: token });
  if (!row) return null;
  return summarize(await expireContractIfNeeded(row));
}

export async function getStudentContractBySignToken(token: string) {
  const row = await getContractRow({ signToken: token });
  if (!row) return null;
  return summarize(await expireContractIfNeeded(row));
}

export async function markStudentContractIntakeViewed(contractId: string) {
  const row = await prisma.studentContract.findUnique({
    where: { id: contractId },
    select: { id: true, status: true },
  });
  if (!row || row.status !== StudentContractStatus.INFO_PENDING) return;
  await appendStudentContractEvent({
    contractId,
    eventType: StudentContractEventType.INTAKE_VIEWED,
    actorType: "PARENT",
    actorLabel: "Viewed intake page",
  });
}

export async function markStudentContractSignViewed(contractId: string) {
  const row = await prisma.studentContract.findUnique({
    where: { id: contractId },
    select: { id: true, status: true, signViewedAt: true },
  });
  if (!row || row.status !== StudentContractStatus.READY_TO_SIGN || row.signViewedAt) return;
  await prisma.studentContract.update({
    where: { id: contractId },
    data: { signViewedAt: new Date() },
  });
  await appendStudentContractEvent({
    contractId,
    eventType: StudentContractEventType.SIGN_VIEWED,
    actorType: "PARENT",
    actorLabel: "Viewed sign page",
  });
}

export async function submitStudentContractIntake(input: {
  token: string;
  parentInfo: ContractParentInfo;
  actorLabel?: string | null;
}) {
  const row = await getContractRow({ intakeToken: input.token });
  if (!row) throw new Error("Contract intake link not found");
  const current = await expireContractIfNeeded(row);
  if (current.status === StudentContractStatus.EXPIRED) {
    throw new Error("Contract intake link has expired");
  }
  if (current.status === StudentContractStatus.VOID) {
    throw new Error("Contract has been voided");
  }
  if (
    current.status !== StudentContractStatus.INFO_PENDING &&
    current.status !== StudentContractStatus.INFO_SUBMITTED
  ) {
    throw new Error("Contract intake is no longer available");
  }

  const { snapshot } = buildStudentContractSnapshot({
    studentId: current.student.id,
    studentName: current.student.name,
    packageId: current.package.id,
    packageType: current.package.type,
    totalMinutes: current.package.totalMinutes,
    paidAmount: current.package.paidAmount,
    financeGateStatus: current.package.financeGateStatus,
    courseName: current.package.course.name,
    parentInfo: input.parentInfo,
    agreementDate: new Date(),
  });

  const next = await prisma.studentContract.update({
    where: { id: current.id },
    data: {
      status: StudentContractStatus.READY_TO_SIGN,
      parentInfoJson: input.parentInfo as unknown as Prisma.InputJsonValue,
      contractSnapshotJson: snapshot as unknown as Prisma.InputJsonValue,
      intakeSubmittedAt: new Date(),
      signToken: createStudentContractToken(),
      signExpiresAt: addDays(new Date(), DEFAULT_TOKEN_TTL_DAYS),
    },
    include: studentContractInclude,
  });
  await appendStudentContractEvent({
    contractId: current.id,
    eventType: StudentContractEventType.INTAKE_SUBMITTED,
    actorType: "PARENT",
    actorLabel: input.actorLabel ?? input.parentInfo.parentFullNameEn,
  });
  return summarize(next);
}

function parseDataUrlImage(input: string) {
  const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid signature image");
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.byteLength) throw new Error("Signature image is empty");
  const ext = mimeType.includes("png") ? ".png" : mimeType.includes("jpeg") ? ".jpg" : ".bin";
  return { buffer, ext };
}

export async function signStudentContract(input: {
  token: string;
  signerName: string;
  signerEmail?: string | null;
  signerPhone?: string | null;
  signerIp?: string | null;
  signatureDataUrl?: string | null;
}) {
  const row = await getContractRow({ signToken: input.token });
  if (!row) throw new Error("Contract sign link not found");
  const current = await expireContractIfNeeded(row);
  if (current.status === StudentContractStatus.EXPIRED) {
    throw new Error("Contract sign link has expired");
  }
  if (current.status === StudentContractStatus.VOID) {
    throw new Error("Contract has been voided");
  }
  if (current.status !== StudentContractStatus.READY_TO_SIGN) {
    throw new Error("Contract is not ready for signing");
  }
  const snapshot = coerceSnapshot(current.contractSnapshotJson);
  if (!snapshot) throw new Error("Contract snapshot is missing");
  const signerName = coerceString(input.signerName);
  if (!signerName) throw new Error("Signer name is required");

  const signatureDataUrl = trimOrNull(input.signatureDataUrl);
  const [storedSignature, signedAt] = await Promise.all([
    signatureDataUrl
      ? (() => {
          const signatureImage = parseDataUrlImage(signatureDataUrl);
          return storeBusinessBuffer(
            {
              content: signatureImage.buffer,
              originalName: `contract-signature-${current.id}${signatureImage.ext}`,
            },
            {
              allowedPrefix: BUSINESS_UPLOAD_PREFIX.contractSignatures,
              subdirSegments: [current.studentId],
            }
          );
        })()
      : Promise.resolve(null),
    Promise.resolve(new Date()),
  ]);

  const signedPdf = await generateSignedStudentContractPdfBuffer({
    snapshot,
    signerName,
    signedAtLabel: new Intl.DateTimeFormat("en-SG", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Singapore",
    }).format(signedAt),
    signerIp: trimOrNull(input.signerIp),
    signatureImagePath: storedSignature?.relativePath ?? null,
  });
  const storedPdf = await storeBusinessBuffer(
    {
      content: signedPdf,
      originalName: `student-contract-${current.id}.pdf`,
    },
    {
      allowedPrefix: BUSINESS_UPLOAD_PREFIX.contracts,
      subdirSegments: [current.studentId],
    }
  );

  const next = await prisma.studentContract.update({
    where: { id: current.id },
    data: {
      status: StudentContractStatus.SIGNED,
      signedAt,
      signViewedAt: current.signViewedAt ?? signedAt,
      signatureImagePath: storedSignature?.relativePath ?? null,
      signedPdfPath: storedPdf.relativePath,
      signerName,
      signerEmail: trimOrNull(input.signerEmail),
      signerPhone: trimOrNull(input.signerPhone),
      signerIp: trimOrNull(input.signerIp),
    },
    include: studentContractInclude,
  });
  await appendStudentContractEvent({
    contractId: current.id,
    eventType: StudentContractEventType.SIGNED,
    actorType: "PARENT",
    actorLabel: signerName,
    payloadJson: {
      signerEmail: trimOrNull(input.signerEmail),
      signerPhone: trimOrNull(input.signerPhone),
      signerIp: trimOrNull(input.signerIp),
    },
  });
  return summarize(next);
}

export async function voidStudentContract(input: {
  contractId: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
  reason?: string | null;
}) {
  const row = await getContractRow({ id: input.contractId });
  if (!row) throw new Error("Contract not found");
  if (row.status === StudentContractStatus.SIGNED) {
    throw new Error("Signed contracts cannot be voided");
  }
  const next = await prisma.studentContract.update({
    where: { id: row.id },
    data: {
      status: StudentContractStatus.VOID,
      voidedAt: new Date(),
    },
    include: studentContractInclude,
  });
  await appendStudentContractEvent({
    contractId: row.id,
    eventType: StudentContractEventType.VOIDED,
    actorType: input.actorUserId ? "ADMIN" : "SYSTEM",
    actorUserId: input.actorUserId ?? null,
    actorLabel: input.actorLabel ?? "Voided contract",
    payloadJson: input.reason ? ({ reason: input.reason } as Prisma.JsonValue) : undefined,
  });
  return summarize(next);
}

export async function generateUnsignedStudentContractBuffer(contractId: string) {
  const row = await getContractRow({ id: contractId });
  if (!row) throw new Error("Contract not found");
  const snapshot = coerceSnapshot(row.contractSnapshotJson);
  if (!snapshot) throw new Error("Contract snapshot is not ready");
  return generateUnsignedStudentContractPdfBuffer(snapshot);
}
