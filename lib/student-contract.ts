import crypto from "crypto";
import {
  Prisma,
  EduTrustCourseFileStatus,
  EduTrustPermissionStatus,
  StudentContractMode,
  StudentContractEventType,
  StudentContractFlowType,
  StudentContractStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type ContractBusinessInfo,
  type ContractParentInfo,
  type ContractSnapshot,
  buildStudentContractSnapshot,
  getStudentContractTemplateInput,
} from "@/lib/student-contract-template";
import {
  BUSINESS_UPLOAD_PREFIX,
  storeBusinessBuffer,
} from "@/lib/business-file-storage";
import {
  generateSignedStudentContractPdfBuffer,
  generateUnsignedStudentContractPdfBuffer,
} from "@/lib/student-contract-pdf";
import { buildTopUpMinutesUpdate } from "@/lib/package-top-up";
import { buildPurchaseTxnCreates } from "@/lib/package-purchase-batches";
import { isPartnerSettlementPackage } from "@/lib/package-finance-gate";
import {
  buildPackageFinanceGateReason,
  createPackageInvoiceApproval,
  getLatestPackageInvoiceApproval,
  shouldRequirePackageInvoiceGate,
} from "@/lib/package-finance-gate";
import { assertGlobalInvoiceNoAvailable, getNextGlobalInvoiceNo } from "@/lib/global-invoice-sequence";
import { createParentInvoice, listParentBillingForPackage } from "@/lib/student-parent-billing";
import { formatDateOnly, normalizeDateOnly } from "@/lib/date-only";
import { getStudentContractInvoiceChoice } from "@/lib/student-contract-invoice-choice";
import {
  isEduTrustCourseContractReady,
  isEduTrustPackageHoursReady,
} from "@/lib/edutrust-student-record";

const DEFAULT_TOKEN_TTL_DAYS = 14;
const CONTRACT_INVOICE_MARKER_PREFIX = "student-contract:";
const CONTRACT_RENEWAL_TOP_UP_MARKER_PREFIX = "student-contract-renewal-topup:";

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
      course: {
        include: {
          eduTrustProfile: {
            include: {
              courseFile: true,
              contractSetup: true,
            },
          },
        },
      },
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
  flowType: StudentContractFlowType;
  contractMode: StudentContractMode;
  status: StudentContractStatus;
  intakeToken: string;
  signToken: string | null;
  intakeExpiresAt: Date | null;
  signExpiresAt: Date | null;
  intakeSubmittedAt: Date | null;
  signViewedAt: Date | null;
  signedAt: Date | null;
  invoiceCreatedAt: Date | null;
  voidedAt: Date | null;
  parentInfo: ContractParentInfo | null;
  businessInfo: ContractBusinessInfo | null;
  contractSnapshot: ContractSnapshot | null;
  signedPdfPath: string | null;
  signatureImagePath: string | null;
  signerName: string | null;
  signerEmail: string | null;
  signerPhone: string | null;
  signerIp: string | null;
  invoiceId: string | null;
  invoiceNo: string | null;
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

function toNumberOrNull(value: unknown) {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : null;
}

function roundMoney(value: number | null | undefined) {
  const numeric = Number(value ?? 0);
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function contractInvoiceMarker(contractId: string) {
  return `${CONTRACT_INVOICE_MARKER_PREFIX}${contractId}`;
}

function contractRenewalTopUpMarker(contractId: string) {
  return `${CONTRACT_RENEWAL_TOP_UP_MARKER_PREFIX}${contractId}`;
}

export function shouldAutoLinkOnlyInvoiceForSignedContract(input: {
  flowType: StudentContractFlowType;
  invoiceCount: number;
}) {
  return input.flowType !== StudentContractFlowType.RENEWAL && input.invoiceCount === 1;
}

export function shouldBlockAmbiguousInvoicesForSignedContract(input: {
  flowType: StudentContractFlowType;
  invoiceCount: number;
}) {
  return input.flowType !== StudentContractFlowType.RENEWAL && input.invoiceCount > 1;
}

function canonicalStudentContractStatus(status: StudentContractStatus) {
  switch (status) {
    case StudentContractStatus.INFO_PENDING:
      return StudentContractStatus.INTAKE_PENDING;
    case StudentContractStatus.INFO_SUBMITTED:
      return StudentContractStatus.INTAKE_SUBMITTED;
    case StudentContractStatus.DRAFT:
      return StudentContractStatus.CONTRACT_DRAFT;
    default:
      return status;
  }
}

function isTerminalStatus(status: StudentContractStatus) {
  const canonical = canonicalStudentContractStatus(status);
  return (
    canonical === StudentContractStatus.SIGNED ||
    canonical === StudentContractStatus.INVOICE_CREATED ||
    canonical === StudentContractStatus.VOID
  );
}

function openStatusesForPackageReuse() {
  return [
    StudentContractStatus.DRAFT,
    StudentContractStatus.INTAKE_PENDING,
    StudentContractStatus.INTAKE_SUBMITTED,
    StudentContractStatus.CONTRACT_DRAFT,
    StudentContractStatus.INFO_PENDING,
    StudentContractStatus.INFO_SUBMITTED,
    StudentContractStatus.READY_TO_SIGN,
  ];
}

export function reusableParentInfoContractStatuses() {
  return [
    StudentContractStatus.READY_TO_SIGN,
    StudentContractStatus.SIGNED,
    StudentContractStatus.INVOICE_CREATED,
    StudentContractStatus.CONTRACT_DRAFT,
    StudentContractStatus.INTAKE_SUBMITTED,
    StudentContractStatus.INFO_SUBMITTED,
    StudentContractStatus.VOID,
  ];
}

function defaultContractTypeLabel(flowType: StudentContractFlowType) {
  return flowType === StudentContractFlowType.RENEWAL
    ? "Renewal tuition agreement / 续费合同"
    : "New purchase tuition agreement / 首购合同";
}

function packageHasStartedUsage(row: {
  paid: boolean;
  paidAt: Date | null;
  totalMinutes: number | null;
  remainingMinutes: number | null;
}) {
  return Boolean(
    row.paid ||
      row.paidAt ||
      (row.totalMinutes != null &&
        row.remainingMinutes != null &&
        row.totalMinutes > row.remainingMinutes)
  );
}

function defaultBusinessInfoFromRow(
  row: {
    student: { name: string };
    package: {
      course: {
        name: string;
        eduTrustProfile?: {
          courseFile?: {
            admissionRequirements: string | null;
            assessmentPlan: string | null;
          } | null;
          contractSetup?: {
            permittedCourseDurationMonths: string | null;
            courseLoadMode: string | null;
            studyCommencementDate: string | null;
            qualification: string | null;
            courseDeveloper: string | null;
            awardingOrganisation: string | null;
            courseEntryRequirements: string | null;
            courseSchedule: string | null;
            scheduledHolidays: string | null;
            assessmentPeriods: string | null;
            finalResultsReleaseDate: string | null;
            qualificationConfermentDate: string | null;
            industrialAttachmentIncluded: boolean;
            industrialAttachmentDuration: string | null;
            miscellaneousFees: string | null;
            refundEvent1Percent: string | null;
            refundEvent1DaysBefore: string | null;
            refundEvent2Percent: string | null;
            refundEvent2DaysBefore: string | null;
            refundEvent3Percent: string | null;
            refundEvent3DaysAfter: string | null;
            refundEvent4Percent: string | null;
            refundEvent4DaysAfter: string | null;
            latePaymentGraceValue: string | null;
            latePaymentGraceUnit: string | null;
            fpsRequired: boolean;
            fpsProvider: string | null;
            fpsPolicyNumber: string | null;
          } | null;
        } | null;
      };
      type: string;
      totalMinutes: number | null;
      paidAmount: number | null;
      validFrom?: Date | null;
      validTo?: Date | null;
    };
  },
  flowType: StudentContractFlowType
): ContractBusinessInfo {
  const profile = "eduTrustProfile" in row.package.course ? row.package.course.eduTrustProfile : null;
  const setup = profile?.contractSetup ?? null;
  const courseFile = profile?.courseFile ?? null;
  return {
    courseName: row.package.course.name,
    packageType: row.package.type === "MONTHLY" ? "Monthly package / 月卡" : "Hours package / 课时包",
    totalMinutes: row.package.totalMinutes ?? null,
    feeAmount: row.package.paidAmount ?? null,
    billTo: row.student.name,
    agreementDateIso: formatDateOnly(new Date()),
    lessonMode: setup?.courseLoadMode ?? null,
    campusName: null,
    contractTypeLabel: defaultContractTypeLabel(flowType),
    courseCommencementDateIso: row.package.validFrom ? formatDateOnly(row.package.validFrom) : null,
    courseCompletionDateIso: row.package.validTo ? formatDateOnly(row.package.validTo) : null,
    permittedCourseDurationMonths: setup?.permittedCourseDurationMonths ?? null,
    courseLoadMode: setup?.courseLoadMode ?? null,
    studyCommencementDate: setup?.studyCommencementDate ?? null,
    qualification: setup?.qualification ?? null,
    courseDeveloper: setup?.courseDeveloper ?? null,
    awardingOrganisation: setup?.awardingOrganisation ?? null,
    courseEntryRequirements: setup?.courseEntryRequirements ?? courseFile?.admissionRequirements ?? null,
    courseSchedule: setup?.courseSchedule ?? null,
    scheduledHolidays: setup?.scheduledHolidays ?? null,
    assessmentPeriods: setup?.assessmentPeriods ?? courseFile?.assessmentPlan ?? null,
    finalResultsReleaseDate: setup?.finalResultsReleaseDate ?? null,
    qualificationConfermentDate: setup?.qualificationConfermentDate ?? null,
    industrialAttachmentIncluded: setup?.industrialAttachmentIncluded ?? false,
    industrialAttachmentDuration: setup?.industrialAttachmentDuration ?? null,
    miscellaneousFees: setup?.miscellaneousFees ?? null,
    refundEvent1Percent: setup?.refundEvent1Percent ?? null,
    refundEvent1DaysBefore: setup?.refundEvent1DaysBefore ?? null,
    refundEvent2Percent: setup?.refundEvent2Percent ?? null,
    refundEvent2DaysBefore: setup?.refundEvent2DaysBefore ?? null,
    refundEvent3Percent: setup?.refundEvent3Percent ?? null,
    refundEvent3DaysAfter: setup?.refundEvent3DaysAfter ?? null,
    refundEvent4Percent: setup?.refundEvent4Percent ?? null,
    refundEvent4DaysAfter: setup?.refundEvent4DaysAfter ?? null,
    latePaymentGraceValue: setup?.latePaymentGraceValue ?? null,
    latePaymentGraceUnit: setup?.latePaymentGraceUnit ?? null,
    fpsRequired: setup?.fpsRequired ?? false,
    fpsProvider: setup?.fpsProvider ?? null,
    fpsPolicyNumber: setup?.fpsPolicyNumber ?? null,
    careServiceIncluded: false,
    carePricingPlan: null,
    careProgramLabel: null,
    tuitionFeeAmount: null,
    careServiceFeeAmount: null,
    careServiceStartDateIso: null,
    careServiceEndDateIso: null,
    careUpdateCadence: null,
    careReportCadence: null,
    careDeliveryChannel: null,
    careEmergencyAdvanceLimit: null,
    careScopeLabels: [],
    careExclusionLabels: [],
  };
}

export function buildStudentContractIntakePath(token: string) {
  return `/contract-intake/${encodeURIComponent(token)}`;
}

export function buildStudentContractSignPath(token: string) {
  return `/contract/${encodeURIComponent(token)}`;
}

export function studentContractStatusLabel(status: StudentContractStatus) {
  switch (canonicalStudentContractStatus(status)) {
    case StudentContractStatus.INTAKE_PENDING:
      return "Waiting for parent profile";
    case StudentContractStatus.INTAKE_SUBMITTED:
      return "Waiting for school review";
    case StudentContractStatus.CONTRACT_DRAFT:
      return "Waiting to send sign link";
    case StudentContractStatus.READY_TO_SIGN:
      return "Waiting for signature";
    case StudentContractStatus.SIGNED:
      return "Signed";
    case StudentContractStatus.INVOICE_CREATED:
      return "Signed + invoice ready";
    case StudentContractStatus.EXPIRED:
      return "Link expired";
    case StudentContractStatus.VOID:
      return "Archived";
    default:
      return "Draft";
  }
}

export function studentContractStatusLabelZh(status: StudentContractStatus) {
  switch (canonicalStudentContractStatus(status)) {
    case StudentContractStatus.INTAKE_PENDING:
      return "待家长填写资料";
    case StudentContractStatus.INTAKE_SUBMITTED:
      return "待教务补商务信息";
    case StudentContractStatus.CONTRACT_DRAFT:
      return "待发送签字链接";
    case StudentContractStatus.READY_TO_SIGN:
      return "待家长签字";
    case StudentContractStatus.SIGNED:
      return "已签约";
    case StudentContractStatus.INVOICE_CREATED:
      return "已签约并已生成发票";
    case StudentContractStatus.EXPIRED:
      return "链接已过期";
    case StudentContractStatus.VOID:
      return "已作废归档";
    default:
      return "草稿";
  }
}

export function studentContractFlowLabel(flowType: StudentContractFlowType) {
  return flowType === StudentContractFlowType.RENEWAL ? "Renewal" : "New purchase";
}

export function studentContractFlowLabelZh(flowType: StudentContractFlowType) {
  return flowType === StudentContractFlowType.RENEWAL ? "续费" : "首购";
}

function coerceParentInfo(raw: unknown): ContractParentInfo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const parentFullNameEn = coerceString(row.parentFullNameEn);
  const phone = coerceString(row.phone);
  const email = coerceString(row.email);
  const address = coerceString(row.address);
  const relationshipToStudent = coerceString(row.relationshipToStudent);
  if (!parentFullNameEn || !phone || !email || !relationshipToStudent) return null;
  return {
    parentFullNameEn,
    parentFullNameZh: trimOrNull(row.parentFullNameZh),
    phone,
    email,
    address: address || null,
    relationshipToStudent,
    isLegalGuardian: Boolean(row.isLegalGuardian),
    emergencyContactName: trimOrNull(row.emergencyContactName),
    emergencyContactPhone: trimOrNull(row.emergencyContactPhone),
  };
}

function coerceBusinessInfo(raw: unknown): ContractBusinessInfo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const courseName = coerceString(row.courseName);
  const packageType = coerceString(row.packageType);
  const billTo = coerceString(row.billTo);
  const agreementDateIso = normalizeDateOnly(
    typeof row.agreementDateIso === "string" || row.agreementDateIso instanceof Date ? row.agreementDateIso : null,
    new Date()
  );
  if (!courseName || !packageType || !billTo || !agreementDateIso) return null;
  const stringArray = (value: unknown) => Array.isArray(value)
    ? value.map((item) => coerceString(item)).filter(Boolean)
    : [];
  return {
    courseName,
    packageType,
    totalMinutes: toNumberOrNull(row.totalMinutes),
    feeAmount: toNumberOrNull(row.feeAmount),
    billTo,
    agreementDateIso,
    lessonMode: trimOrNull(row.lessonMode),
    campusName: trimOrNull(row.campusName),
    contractTypeLabel: trimOrNull(row.contractTypeLabel),
    courseCommencementDateIso: normalizeDateOnly(row.courseCommencementDateIso as string | Date | null | undefined) ?? null,
    courseCompletionDateIso: normalizeDateOnly(row.courseCompletionDateIso as string | Date | null | undefined) ?? null,
    permittedCourseDurationMonths: trimOrNull(row.permittedCourseDurationMonths),
    courseLoadMode: trimOrNull(row.courseLoadMode),
    studyCommencementDate: trimOrNull(row.studyCommencementDate),
    qualification: trimOrNull(row.qualification),
    courseDeveloper: trimOrNull(row.courseDeveloper),
    awardingOrganisation: trimOrNull(row.awardingOrganisation),
    courseEntryRequirements: trimOrNull(row.courseEntryRequirements),
    courseSchedule: trimOrNull(row.courseSchedule),
    scheduledHolidays: trimOrNull(row.scheduledHolidays),
    assessmentPeriods: trimOrNull(row.assessmentPeriods),
    finalResultsReleaseDate: trimOrNull(row.finalResultsReleaseDate),
    qualificationConfermentDate: trimOrNull(row.qualificationConfermentDate),
    industrialAttachmentIncluded: Boolean(row.industrialAttachmentIncluded),
    industrialAttachmentDuration: trimOrNull(row.industrialAttachmentDuration),
    miscellaneousFees: trimOrNull(row.miscellaneousFees),
    refundEvent1Percent: trimOrNull(row.refundEvent1Percent),
    refundEvent1DaysBefore: trimOrNull(row.refundEvent1DaysBefore),
    refundEvent2Percent: trimOrNull(row.refundEvent2Percent),
    refundEvent2DaysBefore: trimOrNull(row.refundEvent2DaysBefore),
    refundEvent3Percent: trimOrNull(row.refundEvent3Percent),
    refundEvent3DaysAfter: trimOrNull(row.refundEvent3DaysAfter),
    refundEvent4Percent: trimOrNull(row.refundEvent4Percent),
    refundEvent4DaysAfter: trimOrNull(row.refundEvent4DaysAfter),
    latePaymentGraceValue: trimOrNull(row.latePaymentGraceValue),
    latePaymentGraceUnit: trimOrNull(row.latePaymentGraceUnit),
    fpsRequired: Boolean(row.fpsRequired),
    fpsProvider: trimOrNull(row.fpsProvider),
    fpsPolicyNumber: trimOrNull(row.fpsPolicyNumber),
    careServiceIncluded: Boolean(row.careServiceIncluded),
    carePricingPlan: trimOrNull(row.carePricingPlan),
    careProgramLabel: trimOrNull(row.careProgramLabel),
    tuitionFeeAmount: toNumberOrNull(row.tuitionFeeAmount),
    careServiceFeeAmount: toNumberOrNull(row.careServiceFeeAmount),
    careServiceStartDateIso: normalizeDateOnly(row.careServiceStartDateIso as string | Date | null | undefined) ?? null,
    careServiceEndDateIso: normalizeDateOnly(row.careServiceEndDateIso as string | Date | null | undefined) ?? null,
    careUpdateCadence: trimOrNull(row.careUpdateCadence),
    careReportCadence: trimOrNull(row.careReportCadence),
    careDeliveryChannel: trimOrNull(row.careDeliveryChannel),
    careEmergencyAdvanceLimit: toNumberOrNull(row.careEmergencyAdvanceLimit),
    careScopeLabels: stringArray(row.careScopeLabels),
    careExclusionLabels: stringArray(row.careExclusionLabels),
  };
}

export function coerceSnapshot(raw: unknown): ContractSnapshot | null {
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
    flowType: row.flowType,
    contractMode: row.contractMode,
    status: canonicalStudentContractStatus(row.status),
    intakeToken: row.intakeToken,
    signToken: row.signToken ?? null,
    intakeExpiresAt: row.intakeExpiresAt ?? null,
    signExpiresAt: row.signExpiresAt ?? null,
    intakeSubmittedAt: row.intakeSubmittedAt ?? null,
    signViewedAt: row.signViewedAt ?? null,
    signedAt: row.signedAt ?? null,
    invoiceCreatedAt: row.invoiceCreatedAt ?? null,
    voidedAt: row.voidedAt ?? null,
    parentInfo: coerceParentInfo(row.parentInfoJson),
    businessInfo: coerceBusinessInfo(row.businessInfoJson),
    contractSnapshot: coerceSnapshot(row.contractSnapshotJson),
    signedPdfPath: row.signedPdfPath ?? null,
    signatureImagePath: row.signatureImagePath ?? null,
    signerName: row.signerName ?? null,
    signerEmail: row.signerEmail ?? null,
    signerPhone: row.signerPhone ?? null,
    signerIp: row.signerIp ?? null,
    invoiceId: row.invoiceId ?? null,
    invoiceNo: row.invoiceNo ?? null,
    studentName: row.student.name,
    packageLabel: row.package.type,
    courseName: row.package.course.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function assertDirectBillingPackage(pkg: {
  settlementMode: Prisma.JsonValue | string | null;
}) {
  if (isPartnerSettlementPackage((pkg.settlementMode as never) ?? null)) {
    throw new Error("Partner settlement packages do not use the student contract flow");
  }
}

function assertSsgContractModeAllowed(pkg: {
  totalMinutes: number | null;
  course: {
    eduTrustProfile?: {
      isEduTrustCourse: boolean;
      permissionStatus: EduTrustPermissionStatus;
      courseFileStatus: EduTrustCourseFileStatus;
      minTotalHours: number;
    } | null;
  };
}) {
  const profile = pkg.course.eduTrustProfile;
  if (!profile || !isEduTrustCourseContractReady(profile)) {
    throw new Error("SSG Standard PEI contract can only be used after the EduTrust course is PERMITTED and the Course File is APPROVED.");
  }
  if (!isEduTrustPackageHoursReady({ totalMinutes: pkg.totalMinutes, minTotalHours: profile.minTotalHours })) {
    throw new Error("SSG Standard PEI contract requires the package hours to meet the configured EduTrust minimum.");
  }
}

function assertSsgBusinessInfoCompleteForSigning(businessInfo: ContractBusinessInfo) {
  const required: Array<[keyof ContractBusinessInfo, string]> = [
    ["courseCommencementDateIso", "Course Commencement Date"],
    ["courseCompletionDateIso", "Course Completion Date"],
    ["permittedCourseDurationMonths", "Permitted Course Duration"],
    ["courseLoadMode", "Course load mode"],
    ["studyCommencementDate", "Date of Commencement of studies"],
    ["qualification", "Qualification"],
    ["courseDeveloper", "Developer/Proprietor of the Course"],
    ["awardingOrganisation", "Awarding organisation"],
    ["courseEntryRequirements", "Course entry requirements"],
    ["courseSchedule", "Course schedule"],
    ["scheduledHolidays", "Scheduled holidays"],
    ["assessmentPeriods", "Assessment periods"],
    ["finalResultsReleaseDate", "Expected final results release date"],
    ["qualificationConfermentDate", "Expected qualification conferment date"],
    ["industrialAttachmentDuration", "Industrial attachment duration"],
    ["miscellaneousFees", "Miscellaneous Fees"],
    ["refundEvent1Percent", "Schedule D refund event 1 percentage"],
    ["refundEvent1DaysBefore", "Schedule D refund event 1 days"],
    ["refundEvent2Percent", "Schedule D refund event 2 percentage"],
    ["refundEvent2DaysBefore", "Schedule D refund event 2 days"],
    ["refundEvent3Percent", "Schedule D refund event 3 percentage"],
    ["refundEvent3DaysAfter", "Schedule D refund event 3 days"],
    ["refundEvent4Percent", "Schedule D refund event 4 percentage"],
    ["refundEvent4DaysAfter", "Schedule D refund event 4 days"],
    ["latePaymentGraceValue", "Late payment grace value"],
    ["latePaymentGraceUnit", "Late payment grace unit"],
  ];
  const missing = required.filter(([key]) => !String(businessInfo[key] ?? "").trim()).map(([, label]) => label);
  if (businessInfo.fpsRequired) {
    if (!businessInfo.fpsProvider?.trim()) missing.push("FPS provider");
    if (!businessInfo.fpsPolicyNumber?.trim()) missing.push("FPS policy number");
  }
  if (missing.length) {
    throw new Error(`Complete EduTrust contract setup before preparing SSG sign link: ${missing.join(", ")}.`);
  }
}

async function ensureContractTemplate(mode: StudentContractMode = StudentContractMode.TUITION_AGREEMENT) {
  const template = getStudentContractTemplateInput(mode);
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
  return prisma.studentContract.findUnique({
    where,
    include: studentContractInclude,
  });
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

export async function listStudentContractsForPackage(packageId: string) {
  const rows = await prisma.studentContract.findMany({
    where: { packageId },
    include: studentContractInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 30,
  });
  return rows.map(summarize);
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

async function getLatestReusableParentInfoForStudent(studentId: string, excludePackageId?: string | null) {
  const rows = await prisma.studentContract.findMany({
    where: {
      studentId,
      packageId: excludePackageId ? { not: excludePackageId } : undefined,
      status: {
        in: reusableParentInfoContractStatuses(),
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      parentInfoJson: true,
    },
    take: 20,
  });

  for (const row of rows) {
    const parentInfo = coerceParentInfo(row.parentInfoJson);
    if (parentInfo) return parentInfo;
  }
  return null;
}

export async function hasReusableStudentContractParentInfo(studentId: string, excludePackageId?: string | null) {
  return Boolean(await getLatestReusableParentInfoForStudent(studentId, excludePackageId));
}

export async function createStudentContractDraft(input: {
  studentId: string;
  packageId: string;
  templateSlug?: string;
  createdByUserId?: string | null;
  intakeExpiresAt?: Date | null;
  flowType?: StudentContractFlowType;
  contractMode?: StudentContractMode;
  replacementFromContractId?: string | null;
}) {
  const existing = await prisma.studentContract.findFirst({
    where: {
      packageId: input.packageId,
      status: {
        in: openStatusesForPackageReuse(),
      },
    },
    include: studentContractInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (existing) return summarize(existing);

  const contractMode = input.contractMode ?? StudentContractMode.TUITION_AGREEMENT;
  const [pkg, template] = await Promise.all([
    prisma.coursePackage.findUnique({
      where: { id: input.packageId },
      include: {
        student: true,
        course: { include: { eduTrustProfile: { include: { courseFile: true, contractSetup: true } } } },
      },
    }),
    ensureContractTemplate(contractMode),
  ]);
  if (!pkg || pkg.studentId !== input.studentId) {
    throw new Error("Package not found for this student");
  }
  assertDirectBillingPackage(pkg);
  if (contractMode === StudentContractMode.SSG_STANDARD_PEI_V4) {
    assertSsgContractModeAllowed(pkg);
  }

  const flowType = input.flowType ?? StudentContractFlowType.NEW_PURCHASE;
  if (flowType === StudentContractFlowType.NEW_PURCHASE && packageHasStartedUsage(pkg)) {
    throw new Error("This package already has billing or lesson usage. Use the renewal contract flow instead of first purchase.");
  }
  let replacementSource: StudentContractRow | null = null;
  if (input.replacementFromContractId?.trim()) {
    replacementSource = await getContractRow({ id: input.replacementFromContractId.trim() });
    if (!replacementSource) {
      throw new Error("Replacement source contract not found");
    }
    if (replacementSource.packageId !== input.packageId || replacementSource.studentId !== input.studentId) {
      throw new Error("Replacement source contract does not match this package");
    }
  }
  const defaultBusinessInfo = defaultBusinessInfoFromRow(
    {
      student: pkg.student,
      package: pkg,
    },
    flowType
  );
  const reusableParentInfo =
    coerceParentInfo(replacementSource?.parentInfoJson) ??
    (flowType === StudentContractFlowType.RENEWAL || Boolean(replacementSource)
      ? await getLatestReusableParentInfoForStudent(input.studentId)
      : null);
  const reusableBusinessInfo =
    coerceBusinessInfo(replacementSource?.businessInfoJson) ??
    (flowType === StudentContractFlowType.RENEWAL ? defaultBusinessInfo : null);
  const startsAsDraft = Boolean(reusableParentInfo);

  const row = await prisma.studentContract.create({
    data: {
      studentId: input.studentId,
      packageId: input.packageId,
      templateId: template.id,
      flowType,
      contractMode,
      status:
        startsAsDraft
          ? StudentContractStatus.CONTRACT_DRAFT
          : StudentContractStatus.INTAKE_PENDING,
      intakeToken: createStudentContractToken(),
      intakeExpiresAt: input.intakeExpiresAt ?? addDays(new Date(), DEFAULT_TOKEN_TTL_DAYS),
      parentInfoJson: reusableParentInfo
        ? (reusableParentInfo as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      businessInfoJson:
        reusableBusinessInfo
          ? (reusableBusinessInfo as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      createdByUserId: input.createdByUserId ?? null,
    },
    include: studentContractInclude,
  });
  await appendStudentContractEvent({
    contractId: row.id,
    eventType: StudentContractEventType.GENERATED,
    actorType: input.createdByUserId ? "ADMIN" : "SYSTEM",
    actorUserId: input.createdByUserId ?? null,
    actorLabel:
      replacementSource
        ? "Created replacement contract draft"
        : flowType === StudentContractFlowType.RENEWAL
        ? "Created renewal contract draft"
        : "Created first-purchase intake flow",
    payloadJson: {
      flowType,
      contractMode,
      replacementFromContractId: replacementSource?.id ?? null,
    },
  });
  return summarize(row);
}

export async function createReadyToSignStudentContract(input: {
  studentId: string;
  packageId: string;
  parentInfo: ContractParentInfo;
  businessInfo: Partial<ContractBusinessInfo>;
  createdByUserId?: string | null;
  signExpiresAt?: Date | null;
  flowType?: StudentContractFlowType;
  contractMode?: StudentContractMode;
}) {
  const existing = await prisma.studentContract.findFirst({
    where: {
      packageId: input.packageId,
      status: {
        in: openStatusesForPackageReuse(),
      },
    },
    include: studentContractInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (existing) return summarize(existing);

  const contractMode = input.contractMode ?? StudentContractMode.TUITION_AGREEMENT;
  const [pkg, template] = await Promise.all([
    prisma.coursePackage.findUnique({
      where: { id: input.packageId },
      include: {
        student: true,
        course: { include: { eduTrustProfile: { include: { courseFile: true, contractSetup: true } } } },
      },
    }),
    ensureContractTemplate(contractMode),
  ]);
  if (!pkg || pkg.studentId !== input.studentId) {
    throw new Error("Package not found for this student");
  }
  assertDirectBillingPackage(pkg);
  if (contractMode === StudentContractMode.SSG_STANDARD_PEI_V4) {
    assertSsgContractModeAllowed(pkg);
  }

  const flowType = input.flowType ?? StudentContractFlowType.NEW_PURCHASE;
  const defaultBusinessInfo = defaultBusinessInfoFromRow(
    {
      student: pkg.student,
      package: pkg,
    },
    flowType
  );
  const businessInfo = normalizeBusinessInfoInput(input.businessInfo, defaultBusinessInfo);
  if (contractMode === StudentContractMode.SSG_STANDARD_PEI_V4) {
    assertSsgBusinessInfoCompleteForSigning(businessInfo);
  }
  const { snapshot } = buildStudentContractSnapshot({
    studentId: pkg.studentId,
    studentName: pkg.student.name,
    packageId: pkg.id,
    businessInfo,
    parentInfo: input.parentInfo,
    agreementDate: businessInfo.agreementDateIso,
    contractMode,
  });

  const row = await prisma.studentContract.create({
    data: {
      studentId: pkg.studentId,
      packageId: pkg.id,
      templateId: template.id,
      flowType,
      contractMode,
      status: StudentContractStatus.READY_TO_SIGN,
      intakeToken: createStudentContractToken(),
      signToken: createStudentContractToken(),
      signExpiresAt: input.signExpiresAt ?? addDays(new Date(), DEFAULT_TOKEN_TTL_DAYS),
      intakeSubmittedAt: new Date(),
      parentInfoJson: input.parentInfo as unknown as Prisma.InputJsonValue,
      businessInfoJson: businessInfo as unknown as Prisma.InputJsonValue,
      contractSnapshotJson: snapshot as unknown as Prisma.InputJsonValue,
      createdByUserId: input.createdByUserId ?? null,
    },
    include: studentContractInclude,
  });
  await appendStudentContractEvent({
    contractId: row.id,
    eventType: StudentContractEventType.GENERATED,
    actorType: input.createdByUserId ? "ADMIN" : "SYSTEM",
    actorUserId: input.createdByUserId ?? null,
    actorLabel: "Created ready-to-sign contract",
    payloadJson: { flowType, contractMode, source: "student-parent-intake" },
  });
  await appendStudentContractEvent({
    contractId: row.id,
    eventType: StudentContractEventType.SIGN_READY,
    actorType: input.createdByUserId ? "ADMIN" : "SYSTEM",
    actorUserId: input.createdByUserId ?? null,
    actorLabel: "Prepared sign link from parent intake",
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
  if (isTerminalStatus(row.status)) {
    throw new Error("Signed or invoiced contracts cannot be resent for intake");
  }
  const next = await prisma.studentContract.update({
    where: { id: row.id },
    data: {
      status: StudentContractStatus.INTAKE_PENDING,
      intakeToken: createStudentContractToken(),
      intakeExpiresAt: input.expiresAt ?? addDays(new Date(), DEFAULT_TOKEN_TTL_DAYS),
      signToken: null,
      signExpiresAt: null,
      signViewedAt: null,
      contractSnapshotJson: Prisma.JsonNull,
    },
    include: studentContractInclude,
  });
  await appendStudentContractEvent({
    contractId: row.id,
    eventType: StudentContractEventType.INTAKE_SENT,
    actorType: input.actorUserId ? "ADMIN" : "SYSTEM",
    actorUserId: input.actorUserId ?? null,
    actorLabel: input.actorLabel ?? "Sent parent info link",
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
  if (canonicalStudentContractStatus(row.status) !== StudentContractStatus.READY_TO_SIGN) {
    throw new Error("Contract must be prepared before the sign link can be resent");
  }
  const next = await prisma.studentContract.update({
    where: { id: row.id },
    data: {
      signToken: createStudentContractToken(),
      signExpiresAt: input.expiresAt ?? addDays(new Date(), DEFAULT_TOKEN_TTL_DAYS),
      signViewedAt: null,
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
  const canonical = canonicalStudentContractStatus(row.status);
  const expiresAt =
    canonical === StudentContractStatus.READY_TO_SIGN
      ? row.signExpiresAt
      : canonical === StudentContractStatus.INTAKE_PENDING
      ? row.intakeExpiresAt
      : null;
  if (!expiresAt || expiresAt.getTime() >= Date.now()) return row;
  if (isTerminalStatus(row.status) || canonical === StudentContractStatus.VOID) return row;
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
  if (!row) return;
  if (canonicalStudentContractStatus(row.status) !== StudentContractStatus.INTAKE_PENDING) return;
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
  if (!row) return;
  if (canonicalStudentContractStatus(row.status) !== StudentContractStatus.READY_TO_SIGN || row.signViewedAt) return;
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
  const canonical = canonicalStudentContractStatus(current.status);
  if (canonical === StudentContractStatus.EXPIRED) {
    throw new Error("Contract intake link has expired");
  }
  if (canonical === StudentContractStatus.VOID) {
    throw new Error("Contract has been voided");
  }
  if (canonical !== StudentContractStatus.INTAKE_PENDING && canonical !== StudentContractStatus.INTAKE_SUBMITTED) {
    throw new Error("Contract intake is no longer available");
  }

  const next = await prisma.studentContract.update({
    where: { id: current.id },
    data: {
      status: StudentContractStatus.INTAKE_SUBMITTED,
      parentInfoJson: input.parentInfo as unknown as Prisma.InputJsonValue,
      intakeSubmittedAt: new Date(),
      signToken: null,
      signExpiresAt: null,
      signViewedAt: null,
      contractSnapshotJson: Prisma.JsonNull,
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

function normalizeBusinessInfoInput(
  input: Partial<ContractBusinessInfo>,
  defaults: ContractBusinessInfo
): ContractBusinessInfo {
  const courseName = coerceString(input.courseName ?? defaults.courseName);
  const packageType = coerceString(input.packageType ?? defaults.packageType);
  const billTo = coerceString(input.billTo ?? defaults.billTo);
  const agreementDateIso =
    normalizeDateOnly(input.agreementDateIso ?? defaults.agreementDateIso, new Date()) ?? formatDateOnly(new Date());
  if (!courseName || !packageType || !billTo) {
    throw new Error("Course, package type, and bill-to are required");
  }
  const totalMinutesRaw = Number(input.totalMinutes ?? defaults.totalMinutes ?? 0);
  const totalMinutes = Number.isFinite(totalMinutesRaw) && totalMinutesRaw > 0 ? Math.round(totalMinutesRaw) : null;
  const feeAmountRaw = Number(input.feeAmount ?? defaults.feeAmount ?? 0);
  const feeAmount = Number.isFinite(feeAmountRaw) && feeAmountRaw > 0 ? roundMoney(feeAmountRaw) : null;
  const text = (key: keyof ContractBusinessInfo) => trimOrNull(input[key] ?? defaults[key]);
  const careServiceIncluded = Boolean(input.careServiceIncluded ?? defaults.careServiceIncluded);
  const numeric = (key: keyof ContractBusinessInfo) => {
    const value = Number(input[key] ?? defaults[key] ?? 0);
    return Number.isFinite(value) && value >= 0 ? roundMoney(value) : null;
  };
  const stringArray = (value: unknown, fallback: unknown) => {
    const source = Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : [];
    return source.map((item) => coerceString(item)).filter(Boolean);
  };
  const careServiceStartDateIso = normalizeDateOnly(input.careServiceStartDateIso ?? defaults.careServiceStartDateIso) ?? null;
  const careServiceEndDateIso = normalizeDateOnly(input.careServiceEndDateIso ?? defaults.careServiceEndDateIso) ?? null;
  const tuitionFeeAmount = numeric("tuitionFeeAmount");
  const careServiceFeeAmount = numeric("careServiceFeeAmount");
  const careEmergencyAdvanceLimit = numeric("careEmergencyAdvanceLimit");
  const careScopeLabels = stringArray(input.careScopeLabels, defaults.careScopeLabels);
  const careExclusionLabels = stringArray(input.careExclusionLabels, defaults.careExclusionLabels);
  if (careServiceIncluded) {
    if (!feeAmount || !tuitionFeeAmount || !careServiceFeeAmount) {
      throw new Error("Tuition fee, Full Care fee, and total agreement fee are required for a Full Care contract");
    }
    if (Math.abs(tuitionFeeAmount + careServiceFeeAmount - feeAmount) > 0.01) {
      throw new Error("Tuition fee plus Full Care fee must equal the total agreement fee");
    }
    if (!careServiceStartDateIso || !careServiceEndDateIso || careServiceEndDateIso <= careServiceStartDateIso) {
      throw new Error("Full Care service start and end dates must form a valid service period");
    }
    if (!careScopeLabels.length) throw new Error("Full Care service scope is missing");
  }
  return {
    courseName,
    packageType,
    totalMinutes,
    feeAmount,
    billTo,
    agreementDateIso,
    lessonMode: trimOrNull(input.lessonMode ?? defaults.lessonMode),
    campusName: trimOrNull(input.campusName ?? defaults.campusName),
    contractTypeLabel: trimOrNull(input.contractTypeLabel ?? defaults.contractTypeLabel),
    courseCommencementDateIso:
      normalizeDateOnly(input.courseCommencementDateIso ?? defaults.courseCommencementDateIso) ?? null,
    courseCompletionDateIso:
      normalizeDateOnly(input.courseCompletionDateIso ?? defaults.courseCompletionDateIso) ?? null,
    permittedCourseDurationMonths: text("permittedCourseDurationMonths"),
    courseLoadMode: text("courseLoadMode"),
    studyCommencementDate: text("studyCommencementDate"),
    qualification: text("qualification"),
    courseDeveloper: text("courseDeveloper"),
    awardingOrganisation: text("awardingOrganisation"),
    courseEntryRequirements: text("courseEntryRequirements"),
    courseSchedule: text("courseSchedule"),
    scheduledHolidays: text("scheduledHolidays"),
    assessmentPeriods: text("assessmentPeriods"),
    finalResultsReleaseDate: text("finalResultsReleaseDate"),
    qualificationConfermentDate: text("qualificationConfermentDate"),
    industrialAttachmentIncluded: Boolean(input.industrialAttachmentIncluded ?? defaults.industrialAttachmentIncluded),
    industrialAttachmentDuration: text("industrialAttachmentDuration"),
    miscellaneousFees: text("miscellaneousFees"),
    refundEvent1Percent: text("refundEvent1Percent"),
    refundEvent1DaysBefore: text("refundEvent1DaysBefore"),
    refundEvent2Percent: text("refundEvent2Percent"),
    refundEvent2DaysBefore: text("refundEvent2DaysBefore"),
    refundEvent3Percent: text("refundEvent3Percent"),
    refundEvent3DaysAfter: text("refundEvent3DaysAfter"),
    refundEvent4Percent: text("refundEvent4Percent"),
    refundEvent4DaysAfter: text("refundEvent4DaysAfter"),
    latePaymentGraceValue: text("latePaymentGraceValue"),
    latePaymentGraceUnit: text("latePaymentGraceUnit"),
    fpsRequired: Boolean(input.fpsRequired ?? defaults.fpsRequired),
    fpsProvider: text("fpsProvider"),
    fpsPolicyNumber: text("fpsPolicyNumber"),
    careServiceIncluded,
    carePricingPlan: careServiceIncluded ? text("carePricingPlan") : null,
    careProgramLabel: careServiceIncluded ? text("careProgramLabel") : null,
    tuitionFeeAmount: careServiceIncluded ? tuitionFeeAmount : null,
    careServiceFeeAmount: careServiceIncluded ? careServiceFeeAmount : null,
    careServiceStartDateIso: careServiceIncluded ? careServiceStartDateIso : null,
    careServiceEndDateIso: careServiceIncluded ? careServiceEndDateIso : null,
    careUpdateCadence: careServiceIncluded ? text("careUpdateCadence") : null,
    careReportCadence: careServiceIncluded ? text("careReportCadence") : null,
    careDeliveryChannel: careServiceIncluded ? text("careDeliveryChannel") : null,
    careEmergencyAdvanceLimit: careServiceIncluded ? careEmergencyAdvanceLimit : null,
    careScopeLabels: careServiceIncluded ? careScopeLabels : [],
    careExclusionLabels: careServiceIncluded ? careExclusionLabels : [],
  };
}

export async function saveStudentContractBusinessDraft(input: {
  contractId: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
  businessInfo: Partial<ContractBusinessInfo>;
}) {
  const row = await getContractRow({ id: input.contractId });
  if (!row) throw new Error("Contract not found");
  const current = await expireContractIfNeeded(row);
  const canonical = canonicalStudentContractStatus(current.status);
  if (canonical === StudentContractStatus.VOID || canonical === StudentContractStatus.SIGNED || canonical === StudentContractStatus.INVOICE_CREATED) {
    throw new Error("Signed or closed contracts can no longer be edited");
  }
  const parentInfo = coerceParentInfo(current.parentInfoJson);
  if (current.flowType === StudentContractFlowType.NEW_PURCHASE && !parentInfo) {
    throw new Error("Wait for the parent info form before preparing the contract draft");
  }
  const defaults = defaultBusinessInfoFromRow(current, current.flowType);
  const businessInfo = normalizeBusinessInfoInput(input.businessInfo, defaults);

  const next = await prisma.studentContract.update({
    where: { id: current.id },
    data: {
      status: StudentContractStatus.CONTRACT_DRAFT,
      businessInfoJson: businessInfo as unknown as Prisma.InputJsonValue,
      contractSnapshotJson: Prisma.JsonNull,
      signToken: null,
      signExpiresAt: null,
      signViewedAt: null,
    },
    include: studentContractInclude,
  });
  await appendStudentContractEvent({
    contractId: current.id,
    eventType: StudentContractEventType.BUSINESS_DRAFT_SAVED,
    actorType: input.actorUserId ? "ADMIN" : "SYSTEM",
    actorUserId: input.actorUserId ?? null,
    actorLabel: input.actorLabel ?? "Saved contract draft details",
    payloadJson: {
      feeAmount: businessInfo.feeAmount,
      totalMinutes: businessInfo.totalMinutes,
      billTo: businessInfo.billTo,
      careServiceIncluded: businessInfo.careServiceIncluded || false,
      carePricingPlan: businessInfo.carePricingPlan ?? null,
      tuitionFeeAmount: businessInfo.tuitionFeeAmount ?? null,
      careServiceFeeAmount: businessInfo.careServiceFeeAmount ?? null,
    },
  });
  return summarize(next);
}

export async function prepareStudentContractForSigning(input: {
  contractId: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
  expiresAt?: Date | null;
}) {
  const row = await getContractRow({ id: input.contractId });
  if (!row) throw new Error("Contract not found");
  const current = await expireContractIfNeeded(row);
  const canonical = canonicalStudentContractStatus(current.status);
  if (canonical === StudentContractStatus.VOID || canonical === StudentContractStatus.SIGNED || canonical === StudentContractStatus.INVOICE_CREATED) {
    throw new Error("Closed contracts cannot be reopened for signing");
  }
  const parentInfo = coerceParentInfo(current.parentInfoJson);
  if (!parentInfo) {
    throw new Error("Parent information is still missing");
  }
  const businessInfo =
    coerceBusinessInfo(current.businessInfoJson) ?? defaultBusinessInfoFromRow(current, current.flowType);
  if (current.contractMode === StudentContractMode.SSG_STANDARD_PEI_V4) {
    assertSsgContractModeAllowed(current.package);
    assertSsgBusinessInfoCompleteForSigning(businessInfo);
  }
  if (current.flowType === StudentContractFlowType.RENEWAL) {
    const invoiceChoice = await getStudentContractInvoiceChoice(current.id);
    if (!invoiceChoice) {
      throw new Error("Select whether this renewal should create a new invoice or link an existing invoice before preparing the sign link.");
    }
  }
  const { snapshot } = buildStudentContractSnapshot({
    studentId: current.student.id,
    studentName: current.student.name,
    packageId: current.package.id,
    businessInfo,
    parentInfo,
    agreementDate: businessInfo.agreementDateIso,
    contractMode: current.contractMode,
  });

  const next = await prisma.studentContract.update({
    where: { id: current.id },
    data: {
      status: StudentContractStatus.READY_TO_SIGN,
      businessInfoJson: businessInfo as unknown as Prisma.InputJsonValue,
      contractSnapshotJson: snapshot as unknown as Prisma.InputJsonValue,
      signToken: createStudentContractToken(),
      signExpiresAt: input.expiresAt ?? addDays(new Date(), DEFAULT_TOKEN_TTL_DAYS),
      signViewedAt: null,
    },
    include: studentContractInclude,
  });
  await appendStudentContractEvent({
    contractId: current.id,
    eventType: StudentContractEventType.SIGN_READY,
    actorType: input.actorUserId ? "ADMIN" : "SYSTEM",
    actorUserId: input.actorUserId ?? null,
    actorLabel: input.actorLabel ?? "Prepared sign link",
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

async function ensureInvoiceForSignedContract(row: StudentContractRow, snapshot: ContractSnapshot) {
  const billing = await listParentBillingForPackage(row.packageId);
  const noteMarker = contractInvoiceMarker(row.id);
  const markedInvoice =
    row.invoiceId
      ? billing.invoices.find((invoice) => invoice.id === row.invoiceId) ?? null
      : billing.invoices.find((invoice) => String(invoice.note ?? "").includes(noteMarker)) ?? null;
  if (markedInvoice) {
    return {
      invoiceId: markedInvoice.id,
      invoiceNo: markedInvoice.invoiceNo,
      invoiceCreatedAt: new Date(markedInvoice.createdAt),
      created: false,
      choiceMode: "EXISTING_LINK" as const,
      choiceNote: null,
      choiceSelectedBy: null,
    };
  }

  const renewalChoice =
    row.flowType === StudentContractFlowType.RENEWAL
      ? await getStudentContractInvoiceChoice(row.id)
      : null;
  if (row.flowType === StudentContractFlowType.RENEWAL && !renewalChoice) {
    throw new Error("Renewal contract needs an invoice choice before the sign link can be used.");
  }
  if (renewalChoice?.mode === "LINK_EXISTING") {
    const selectedInvoice = billing.invoices.find((invoice) => invoice.id === renewalChoice.invoiceId) ?? null;
    if (!selectedInvoice) {
      throw new Error("Selected invoice no longer exists. Please choose the renewal invoice again.");
    }
    return {
      invoiceId: selectedInvoice.id,
      invoiceNo: selectedInvoice.invoiceNo,
      invoiceCreatedAt: new Date(selectedInvoice.createdAt),
      created: false,
      choiceMode: renewalChoice.mode,
      choiceNote: renewalChoice.confirmationNote,
      choiceSelectedBy: renewalChoice.selectedBy,
    };
  }

  if (
    shouldAutoLinkOnlyInvoiceForSignedContract({
      flowType: row.flowType,
      invoiceCount: billing.invoices.length,
    })
  ) {
    const onlyInvoice = billing.invoices[0];
    return {
      invoiceId: onlyInvoice.id,
      invoiceNo: onlyInvoice.invoiceNo,
      invoiceCreatedAt: new Date(onlyInvoice.createdAt),
      created: false,
      choiceMode: "AUTO_ONLY_INVOICE" as const,
      choiceNote: null,
      choiceSelectedBy: null,
    };
  }

  if (
    shouldBlockAmbiguousInvoicesForSignedContract({
      flowType: row.flowType,
      invoiceCount: billing.invoices.length,
    })
  ) {
    throw new Error("This package already has multiple invoices. Please review billing manually before signing.");
  }

  const agreementIssueDate =
    normalizeDateOnly(snapshot.generatedAtIso, new Date()) ??
    normalizeDateOnly(snapshot.agreementDateLabel, new Date()) ??
    formatDateOnly(new Date());
  const invoiceNo = await getNextGlobalInvoiceNo(agreementIssueDate);
  await assertGlobalInvoiceNoAvailable(invoiceNo);
  const amount = roundMoney(snapshot.package.feeAmount);
  const invoice = await createParentInvoice({
    packageId: row.packageId,
    studentId: row.studentId,
    invoiceNo,
    issueDate: agreementIssueDate,
    dueDate: agreementIssueDate,
    courseStartDate: agreementIssueDate,
    courseEndDate: null,
    billTo: snapshot.package.billTo || row.student.name,
    quantity: 1,
    description: `Student contract invoice for ${row.student.name} (${snapshot.package.courseName}, ${snapshot.package.totalHoursLabel})`,
    amount,
    gstAmount: 0,
    totalAmount: amount,
    paymentTerms: "Immediate",
    note: `Auto-created from signed student contract ${row.id}. ${noteMarker}`,
    createdBy: "system.contract@sgtmanage.local",
  });

  return {
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNo,
    invoiceCreatedAt: new Date(invoice.createdAt),
    created: true,
    choiceMode: renewalChoice?.mode ?? "CREATE_NEW",
    choiceNote: renewalChoice?.confirmationNote ?? null,
    choiceSelectedBy: renewalChoice?.selectedBy ?? null,
  };
}

async function ensurePackageGateAfterSignedContract(input: {
  row: StudentContractRow;
  invoiceId: string;
  invoiceNo: string;
}) {
  if (
    !shouldRequirePackageInvoiceGate({
      settlementMode: input.row.package.settlementMode,
      invoiceGateExempt: false,
    })
  ) {
    return;
  }

  const existingApproval = await getLatestPackageInvoiceApproval(input.row.packageId);
  if (!existingApproval) {
    await createPackageInvoiceApproval({
      packageId: input.row.packageId,
      invoiceId: input.invoiceId,
      submittedBy: "system.contract@sgtmanage.local",
    });
  }
  const nextStatus =
    existingApproval?.status === "APPROVED"
      ? "SCHEDULABLE"
      : existingApproval?.status === "REJECTED"
      ? "BLOCKED"
      : "INVOICE_PENDING_MANAGER";

  await prisma.coursePackage.update({
    where: { id: input.row.packageId },
    data: {
      financeGateStatus: nextStatus,
      financeGateReason: buildPackageFinanceGateReason({
        status: nextStatus,
        invoiceNo: input.invoiceNo,
        rejectReason: existingApproval?.managerRejectReason ?? null,
      }),
      financeGateUpdatedAt: new Date(),
      financeGateUpdatedBy: "system.contract@sgtmanage.local",
    },
  });
}

async function ensureRenewalTopUpAfterSign(input: {
  row: StudentContractRow;
  snapshot: ContractSnapshot;
  signedAt: Date;
}) {
  if (input.row.flowType !== StudentContractFlowType.RENEWAL) {
    return { applied: false, topUpMinutes: 0 };
  }
  if (input.row.package.type !== "HOURS") {
    return { applied: false, topUpMinutes: 0 };
  }

  const topUpMinutes = Math.max(0, Math.round(Number(input.snapshot.package.totalMinutes ?? 0)));
  if (!Number.isFinite(topUpMinutes) || topUpMinutes <= 0) {
    throw new Error("Renewal contract must include valid lesson hours before signing");
  }

  const marker = contractRenewalTopUpMarker(input.row.id);
  const existingTxn = await prisma.packageTxn.findFirst({
    where: {
      packageId: input.row.packageId,
      kind: "PURCHASE",
      note: { contains: marker },
    },
    select: { id: true },
  });
  if (existingTxn) {
    return { applied: false, topUpMinutes };
  }

  const totalAmount = roundMoney(input.snapshot.package.feeAmount);
  const topUpTxns = buildPurchaseTxnCreates({
    batches: [{ minutes: topUpMinutes, note: "Signed renewal contract / 已签续费合同" }],
    totalAmount: totalAmount > 0 ? totalAmount : null,
    defaultNote: marker,
    prefix: "Renewal contract top-up",
    baseCreatedAt: input.signedAt,
  });

  await prisma.$transaction(async (tx) => {
    const pkgNow = await tx.coursePackage.findUnique({
      where: { id: input.row.packageId },
      select: {
        id: true,
        remainingMinutes: true,
        totalMinutes: true,
      },
    });
    if (!pkgNow) {
      throw new Error("Package not found");
    }

    await tx.coursePackage.update({
      where: { id: input.row.packageId },
      data: buildTopUpMinutesUpdate(
        {
          remainingMinutes: pkgNow.remainingMinutes,
          totalMinutes: pkgNow.totalMinutes,
        },
        topUpMinutes
      ),
    });

    for (const txn of topUpTxns) {
      await tx.packageTxn.create({
        data: {
          packageId: input.row.packageId,
          kind: txn.kind,
          deltaMinutes: txn.deltaMinutes,
          deltaAmount: txn.deltaAmount,
          note: txn.note,
          createdAt: txn.createdAt,
        },
      });
    }
  });

  return { applied: true, topUpMinutes };
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
  const canonical = canonicalStudentContractStatus(current.status);
  if (canonical === StudentContractStatus.EXPIRED) {
    throw new Error("Contract sign link has expired");
  }
  if (canonical === StudentContractStatus.VOID) {
    throw new Error("Contract has been voided");
  }
  if (canonical === StudentContractStatus.INVOICE_CREATED) {
    return summarize(current);
  }
  if (canonical !== StudentContractStatus.READY_TO_SIGN) {
    throw new Error("Contract is not ready for signing");
  }
  const snapshot = coerceSnapshot(current.contractSnapshotJson);
  if (!snapshot) throw new Error("Contract snapshot is missing");
  const signerName = coerceString(input.signerName);
  if (!signerName) throw new Error("Signer name is required");

  const signatureDataUrl = trimOrNull(input.signatureDataUrl);
  if (!signatureDataUrl) {
    throw new Error("Handwritten signature is required");
  }
  const [storedSignature, signedAt] = await Promise.all([
    (() => {
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
    })(),
    Promise.resolve(new Date()),
  ]);

  const invoice = await ensureInvoiceForSignedContract(current, snapshot);
  await ensurePackageGateAfterSignedContract({
    row: current,
    invoiceId: invoice.invoiceId,
    invoiceNo: invoice.invoiceNo,
  });
  const renewalTopUp = await ensureRenewalTopUpAfterSign({
    row: current,
    snapshot,
    signedAt,
  });
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
      status: StudentContractStatus.INVOICE_CREATED,
      signedAt,
      invoiceCreatedAt: invoice.invoiceCreatedAt,
      signViewedAt: current.signViewedAt ?? signedAt,
      signatureImagePath: storedSignature?.relativePath ?? null,
      signedPdfPath: storedPdf.relativePath,
      signerName,
      signerEmail: trimOrNull(input.signerEmail),
      signerPhone: trimOrNull(input.signerPhone),
      signerIp: trimOrNull(input.signerIp),
      invoiceId: invoice.invoiceId,
      invoiceNo: invoice.invoiceNo,
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
      renewalTopUpMinutes: renewalTopUp.topUpMinutes || null,
      renewalTopUpApplied: renewalTopUp.applied,
    },
  });
  await appendStudentContractEvent({
    contractId: current.id,
    eventType: StudentContractEventType.INVOICE_CREATED,
    actorType: invoice.created ? "SYSTEM" : "ADMIN",
    actorLabel: invoice.created
      ? "Auto-created invoice from signed contract"
      : invoice.choiceSelectedBy
      ? `Linked existing invoice selected by ${invoice.choiceSelectedBy}`
      : "Linked existing invoice after signature",
    payloadJson: {
      invoiceId: invoice.invoiceId,
      invoiceNo: invoice.invoiceNo,
      renewalTopUpMinutes: renewalTopUp.topUpMinutes || null,
      renewalTopUpApplied: renewalTopUp.applied,
      invoiceChoiceMode: invoice.choiceMode,
      invoiceChoiceNote: invoice.choiceNote,
      invoiceChoiceSelectedBy: invoice.choiceSelectedBy,
    },
  });
  await prisma.studentParentIntake.updateMany({
    where: { contractId: current.id },
    data: {
      status: "SIGNED",
      signedAt,
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
  const canonical = canonicalStudentContractStatus(row.status);
  if (canonical === StudentContractStatus.VOID) {
    throw new Error("Contract is already voided");
  }
  const reason = trimOrNull(input.reason);
  if (
    (canonical === StudentContractStatus.SIGNED || canonical === StudentContractStatus.INVOICE_CREATED) &&
    !reason
  ) {
    throw new Error("Voiding a signed or invoiced contract requires a reason");
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
    payloadJson: {
      reason,
      invoiceId: row.invoiceId,
      invoiceNo: row.invoiceNo,
      hadSignedPdf: Boolean(row.signedPdfPath),
    } as Prisma.JsonValue,
  });
  return summarize(next);
}

export async function detachDeletedInvoiceFromStudentContract(input: {
  invoiceId: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
}) {
  const invoiceId = input.invoiceId.trim();
  if (!invoiceId) return null;
  const row = await prisma.studentContract.findFirst({
    where: { invoiceId },
    include: studentContractInclude,
  });
  if (!row) return null;

  await prisma.$transaction(async (tx) => {
    await tx.studentContract.update({
      where: { id: row.id },
      data: {
        status:
          canonicalStudentContractStatus(row.status) === StudentContractStatus.INVOICE_CREATED
            ? StudentContractStatus.SIGNED
            : row.status,
        invoiceId: null,
        invoiceNo: null,
        invoiceCreatedAt: null,
      },
    });

    await tx.packageInvoiceApproval.deleteMany({
      where: {
        packageId: row.packageId,
        invoiceId,
      },
    });

    const latestApproval = await tx.packageInvoiceApproval.findFirst({
      where: { packageId: row.packageId },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    });
    const packageStatus = latestApproval
      ? latestApproval.status === "APPROVED"
        ? "SCHEDULABLE"
        : latestApproval.status === "REJECTED"
        ? "BLOCKED"
        : "INVOICE_PENDING_MANAGER"
      : "EXEMPT";
    const packageReason = buildPackageFinanceGateReason({
      status: packageStatus,
      rejectReason: latestApproval?.managerRejectReason ?? null,
      settlementMode: row.package.settlementMode,
    });

    await tx.coursePackage.update({
      where: { id: row.packageId },
      data: {
        financeGateStatus: packageStatus,
        financeGateReason: packageReason,
        financeGateUpdatedAt: new Date(),
        financeGateUpdatedBy: input.actorLabel ?? "Removed deleted invoice draft from signed contract",
      },
    });
  });

  return summarize(
    (await prisma.studentContract.findUnique({
      where: { id: row.id },
      include: studentContractInclude,
    }))!
  );
}

export async function deleteVoidStudentContractDraft(input: {
  contractId: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
}) {
  const row = await getContractRow({ id: input.contractId });
  if (!row) throw new Error("Contract not found");
  const canonical = canonicalStudentContractStatus(row.status);
  if (canonical !== StudentContractStatus.VOID) {
    throw new Error("Only void contracts can be deleted");
  }
  if (row.signedAt || row.invoiceId || row.invoiceNo || row.invoiceCreatedAt) {
    throw new Error("Signed or invoiced void contracts must stay in history");
  }
  await prisma.studentContract.delete({
    where: { id: row.id },
  });
}

export async function generateUnsignedStudentContractBuffer(contractId: string) {
  const row = await getContractRow({ id: contractId });
  if (!row) throw new Error("Contract not found");
  const snapshot = coerceSnapshot(row.contractSnapshotJson);
  if (!snapshot) throw new Error("Contract snapshot is not ready");
  return generateUnsignedStudentContractPdfBuffer(snapshot);
}
