import crypto from "crypto";
import { Prisma, StudentContractFlowType, StudentParentIntakeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createReadyToSignStudentContract } from "@/lib/student-contract";
import { buildPurchaseTxnCreates, normalizePurchaseBatches, sumPurchaseBatchMinutes } from "@/lib/package-purchase-batches";
import type { ContractParentInfo } from "@/lib/student-contract-template";

const DEFAULT_TOKEN_TTL_DAYS = 14;
const DIRECT_BILLING_INTAKE_SOURCE_NAME = "家长资料链接";
const DIRECT_BILLING_STUDENT_TYPE_NAME = "直客学生";

export type StudentParentIntakePayload = {
  studentName: string;
  studentEnglishName?: string | null;
  school?: string | null;
  grade?: string | null;
  birthDate?: string | null;
  parentFullNameEn: string;
  parentFullNameZh?: string | null;
  phone: string;
  email: string;
  address: string;
  relationshipToStudent: string;
  isLegalGuardian: boolean;
  courseInterest?: string | null;
  note?: string | null;
};

export type StudentParentIntakeSummary = {
  id: string;
  token: string;
  status: StudentParentIntakeStatus;
  label: string | null;
  expiresAt: Date | null;
  submittedAt: Date | null;
  contractReadyAt: Date | null;
  signedAt: Date | null;
  studentId: string | null;
  packageId: string | null;
  contractId: string | null;
  payload: StudentParentIntakePayload | null;
  studentName: string | null;
  packageLabel: string | null;
  contractStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const intakeInclude = {
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
  contract: {
    select: {
      id: true,
      status: true,
    },
  },
} satisfies Prisma.StudentParentIntakeInclude;

type StudentParentIntakeRow = Prisma.StudentParentIntakeGetPayload<{
  include: typeof intakeInclude;
}>;

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function trimOrNull(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeDateOnly(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseBirthDate(value: unknown) {
  const normalized = normalizeDateOnly(value);
  if (!normalized) return null;
  return new Date(`${normalized}T00:00:00+08:00`);
}

function summarize(row: StudentParentIntakeRow): StudentParentIntakeSummary {
  const payload =
    row.payloadJson && typeof row.payloadJson === "object" && !Array.isArray(row.payloadJson)
      ? (row.payloadJson as unknown as StudentParentIntakePayload)
      : null;
  return {
    id: row.id,
    token: row.token,
    status: row.status,
    label: row.label ?? null,
    expiresAt: row.expiresAt ?? null,
    submittedAt: row.submittedAt ?? null,
    contractReadyAt: row.contractReadyAt ?? null,
    signedAt: row.signedAt ?? null,
    studentId: row.studentId ?? null,
    packageId: row.packageId ?? null,
    contractId: row.contractId ?? null,
    payload,
    studentName: row.student?.name ?? null,
    packageLabel: row.package ? `${row.package.course.name} · ${row.package.type}` : null,
    contractStatus: row.contract?.status ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function validatePayload(input: StudentParentIntakePayload) {
  const studentName = String(input.studentName ?? "").trim();
  const parentFullNameEn = String(input.parentFullNameEn ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  const email = String(input.email ?? "").trim();
  const address = String(input.address ?? "").trim();
  const relationshipToStudent = String(input.relationshipToStudent ?? "").trim();
  if (!studentName || !parentFullNameEn || !phone || !email || !address || !relationshipToStudent) {
    throw new Error("Missing required intake fields");
  }
  return {
    studentName,
    studentEnglishName: trimOrNull(input.studentEnglishName),
    school: trimOrNull(input.school),
    grade: trimOrNull(input.grade),
    birthDate: normalizeDateOnly(input.birthDate),
    parentFullNameEn,
    parentFullNameZh: trimOrNull(input.parentFullNameZh),
    phone,
    email,
    address,
    relationshipToStudent,
    isLegalGuardian: Boolean(input.isLegalGuardian),
    courseInterest: trimOrNull(input.courseInterest),
    note: trimOrNull(input.note),
  } satisfies StudentParentIntakePayload;
}

async function ensureDirectBillingStudentMeta() {
  const [source, studentType] = await Promise.all([
    prisma.studentSourceChannel.upsert({
      where: { name: DIRECT_BILLING_INTAKE_SOURCE_NAME },
      update: { isActive: true },
      create: { name: DIRECT_BILLING_INTAKE_SOURCE_NAME, isActive: true },
    }),
    prisma.studentType.upsert({
      where: { name: DIRECT_BILLING_STUDENT_TYPE_NAME },
      update: { isActive: true },
      create: { name: DIRECT_BILLING_STUDENT_TYPE_NAME, isActive: true },
    }),
  ]);
  return { sourceId: source.id, studentTypeId: studentType.id };
}

export function buildStudentParentIntakePath(token: string) {
  return `/student-intake/${encodeURIComponent(token)}`;
}

export function buildStudentParentIntakeAbsoluteUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
  return `${base}${buildStudentParentIntakePath(token)}`;
}

export async function createStudentParentIntakeLink(input?: {
  createdByUserId?: string | null;
  label?: string | null;
  expiresAt?: Date | null;
}) {
  const row = await prisma.studentParentIntake.create({
    data: {
      token: createToken(),
      status: StudentParentIntakeStatus.LINK_SENT,
      label: trimOrNull(input?.label),
      expiresAt: input?.expiresAt ?? addDays(new Date(), DEFAULT_TOKEN_TTL_DAYS),
      createdByUserId: input?.createdByUserId ?? null,
    },
    include: intakeInclude,
  });
  return summarize(row);
}

export async function getStudentParentIntakeByToken(token: string) {
  const row = await prisma.studentParentIntake.findUnique({
    where: { token },
    include: intakeInclude,
  });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now() && row.status === StudentParentIntakeStatus.LINK_SENT) {
    const expired = await prisma.studentParentIntake.update({
      where: { id: row.id },
      data: { status: StudentParentIntakeStatus.VOID },
      include: intakeInclude,
    });
    return summarize(expired);
  }
  return summarize(row);
}

export async function listRecentStudentParentIntakes(limit = 12) {
  const rows = await prisma.studentParentIntake.findMany({
    include: intakeInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: Math.max(1, Math.min(limit, 50)),
  });
  return rows.map(summarize);
}

export async function getLatestStudentParentIntakeForStudent(studentId: string) {
  const row = await prisma.studentParentIntake.findFirst({
    where: { studentId },
    include: intakeInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return row ? summarize(row) : null;
}

export async function submitStudentParentIntake(input: {
  token: string;
  payload: StudentParentIntakePayload;
  actorLabel?: string | null;
}) {
  const current = await prisma.studentParentIntake.findUnique({
    where: { token: input.token },
    include: intakeInclude,
  });
  if (!current) throw new Error("Student intake link not found");
  if (current.status !== StudentParentIntakeStatus.LINK_SENT) {
    throw new Error("This student intake link is no longer available");
  }
  if (current.expiresAt && current.expiresAt.getTime() < Date.now()) {
    throw new Error("Student intake link has expired");
  }

  const payload = validatePayload(input.payload);
  const { sourceId, studentTypeId } = await ensureDirectBillingStudentMeta();
  const noteParts = [
    payload.studentEnglishName ? `English name: ${payload.studentEnglishName}` : null,
    payload.courseInterest ? `Course interest: ${payload.courseInterest}` : null,
    payload.note,
  ].filter(Boolean);

  const next = await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        name: payload.studentName,
        school: payload.school,
        grade: payload.grade,
        birthDate: parseBirthDate(payload.birthDate),
        note: noteParts.length ? noteParts.join("\n") : null,
        sourceChannelId: sourceId,
        studentTypeId,
      },
      select: { id: true, name: true },
    });
    return tx.studentParentIntake.update({
      where: { id: current.id },
      data: {
        status: StudentParentIntakeStatus.SUBMITTED,
        submittedAt: new Date(),
        studentId: student.id,
        payloadJson: payload as unknown as Prisma.InputJsonValue,
      },
      include: intakeInclude,
    });
  });

  return summarize(next);
}

export async function createFirstPurchasePackageAndContractFromIntake(input: {
  intakeId: string;
  courseId: string;
  totalMinutes: number;
  feeAmount: number;
  billTo: string;
  agreementDateIso: string;
  actorUserId?: string | null;
  lessonMode?: string | null;
  campusName?: string | null;
}) {
  const intake = await prisma.studentParentIntake.findUnique({
    where: { id: input.intakeId },
    include: intakeInclude,
  });
  if (!intake) throw new Error("Student intake not found");
  if (!intake.studentId) throw new Error("Student intake has not been submitted yet");
  if (intake.packageId || intake.contractId || intake.status === StudentParentIntakeStatus.CONTRACT_READY) {
    throw new Error("First purchase contract has already been prepared for this intake");
  }

  const payload =
    intake.payloadJson && typeof intake.payloadJson === "object" && !Array.isArray(intake.payloadJson)
      ? (intake.payloadJson as unknown as StudentParentIntakePayload)
      : null;
  if (!payload) throw new Error("Parent intake payload is missing");

  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { id: true, name: true },
  });
  if (!course) throw new Error("Course not found");

  const totalMinutes = Math.round(Number(input.totalMinutes ?? 0));
  const feeAmount = Number(input.feeAmount ?? 0);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    throw new Error("Total minutes must be greater than 0");
  }
  if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
    throw new Error("Fee amount must be greater than 0");
  }
  const billTo = String(input.billTo ?? "").trim();
  if (!billTo) throw new Error("Bill to is required");
  const agreementDateIso = normalizeDateOnly(input.agreementDateIso);
  if (!agreementDateIso) throw new Error("Agreement date is required");

  const purchaseBatches = normalizePurchaseBatches({
    batchesRaw: null,
    fallbackMinutes: totalMinutes,
    fallbackNote: "Created from parent intake",
  });
  const effectiveTotalMinutes = sumPurchaseBatchMinutes(purchaseBatches);
  const createdAt = new Date(`${agreementDateIso}T00:00:00+08:00`);
  const parentInfo: ContractParentInfo = {
    parentFullNameEn: payload.parentFullNameEn,
    parentFullNameZh: payload.parentFullNameZh ?? null,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    relationshipToStudent: payload.relationshipToStudent,
    isLegalGuardian: Boolean(payload.isLegalGuardian),
  };

  const result = await prisma.$transaction(async (tx) => {
    const pkg = await tx.coursePackage.create({
      data: {
        studentId: intake.studentId!,
        courseId: course.id,
        type: "HOURS",
        status: "ACTIVE",
        financeGateStatus: "INVOICE_PENDING_MANAGER",
        financeGateReason: "Contract signing pending before invoice creation.",
        financeGateUpdatedAt: new Date(),
        financeGateUpdatedBy: "system.parent-intake@sgtmanage.local",
        totalMinutes: effectiveTotalMinutes,
        remainingMinutes: effectiveTotalMinutes,
        validFrom: createdAt,
        validTo: null,
        paid: false,
        paidAt: null,
        paidAmount: feeAmount,
        note: "Created from parent intake",
        txns: {
          create: buildPurchaseTxnCreates({
            batches: purchaseBatches,
            totalAmount: feeAmount,
            defaultNote: "Created from parent intake",
            prefix: "Initial purchase",
            baseCreatedAt: createdAt,
          }),
        },
      },
      include: {
        student: { select: { id: true, name: true } },
      },
    });

    return { packageId: pkg.id, studentName: pkg.student.name };
  });
  let contract;
  try {
    contract = await createReadyToSignStudentContract({
      studentId: intake.studentId!,
      packageId: result.packageId,
      parentInfo,
      createdByUserId: input.actorUserId ?? null,
      flowType: StudentContractFlowType.NEW_PURCHASE,
      businessInfo: {
        courseName: course.name,
        packageType: "Hours package / 课时包",
        totalMinutes: effectiveTotalMinutes,
        feeAmount,
        billTo,
        agreementDateIso,
        lessonMode: trimOrNull(input.lessonMode),
        campusName: trimOrNull(input.campusName),
        contractTypeLabel: "New purchase tuition agreement / 首购合同",
      },
    });
  } catch (error) {
    await prisma.packageTxn.deleteMany({ where: { packageId: result.packageId } }).catch(() => null);
    await prisma.coursePackage.delete({ where: { id: result.packageId } }).catch(() => null);
    throw error;
  }

  const updatedIntake = await prisma.studentParentIntake.update({
    where: { id: intake.id },
    data: {
      status: StudentParentIntakeStatus.CONTRACT_READY,
      packageId: result.packageId,
      contractId: contract.id,
      contractReadyAt: new Date(),
    },
    include: intakeInclude,
  });

  return {
    intake: summarize(updatedIntake),
    contract,
  };
}

export async function markStudentParentIntakeSignedByContract(contractId: string) {
  await prisma.studentParentIntake.updateMany({
    where: { contractId },
    data: {
      status: StudentParentIntakeStatus.SIGNED,
      signedAt: new Date(),
    },
  });
}
