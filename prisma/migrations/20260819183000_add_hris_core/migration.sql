-- CreateEnum
CREATE TYPE "HrChecklistStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'RECEIVED', 'VERIFIED', 'NOT_APPLICABLE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "HrDocumentSensitivity" AS ENUM ('STANDARD', 'RESTRICTED', 'HIGHLY_RESTRICTED');

-- CreateEnum
CREATE TYPE "HrLeaveType" AS ENUM ('ANNUAL', 'SICK_OUTPATIENT', 'HOSPITALISATION', 'OFF_IN_LIEU', 'UNPAID', 'OTHER');

-- CreateEnum
CREATE TYPE "HrLeaveStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HrLeaveLedgerEntryType" AS ENUM ('OPENING', 'ACCRUAL', 'ADJUSTMENT', 'USED', 'RESTORED', 'EXPIRY');

-- CreateEnum
CREATE TYPE "HrPayslipStatus" AS ENUM ('DRAFT', 'HR_VERIFIED', 'FINANCE_CONFIRMED', 'DIRECTOR_APPROVED', 'PAID', 'VOID');

-- AlterEnum
ALTER TYPE "StaffWorkspace" ADD VALUE 'HR';

-- CreateTable
CREATE TABLE "HrLegalEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'SG',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrLegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teacherId" TEXT,
    "legalEntityId" TEXT NOT NULL,
    "employeeNo" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "employmentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "department" TEXT,
    "jobTitle" TEXT,
    "managerUserId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "probationEndDate" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "workPattern" JSONB,
    "nationality" TEXT,
    "workPassType" TEXT,
    "workPassExpiry" TIMESTAMP(3),
    "passportExpiry" TIMESTAMP(3),
    "payrollEligible" BOOLEAN NOT NULL DEFAULT true,
    "leaveEligible" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrChecklistItem" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelZh" TEXT NOT NULL,
    "status" "HrChecklistStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "documentId" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "legalEntityId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sensitivity" "HrDocumentSensitivity" NOT NULL DEFAULT 'RESTRICTED',
    "status" "HrChecklistStatus" NOT NULL DEFAULT 'RECEIVED',
    "originalName" TEXT NOT NULL,
    "privatePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "source" TEXT,
    "issuedAt" TIMESTAMP(3),
    "effectiveAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "archiveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrLeavePolicy" (
    "id" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "leaveType" "HrLeaveType" NOT NULL,
    "annualEntitlementMinutes" INTEGER NOT NULL DEFAULT 0,
    "minimumServiceMonths" INTEGER NOT NULL DEFAULT 0,
    "carryForwardMinutes" INTEGER NOT NULL DEFAULT 0,
    "carryForwardExpiryMonths" INTEGER,
    "requiresAttachment" BOOLEAN NOT NULL DEFAULT false,
    "allowHalfDay" BOOLEAN NOT NULL DEFAULT true,
    "allowHourly" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrLeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrLeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "HrLeaveType" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "reason" TEXT,
    "attachmentPrivatePath" TEXT,
    "attachmentOriginalName" TEXT,
    "attachmentMimeType" TEXT,
    "status" "HrLeaveStatus" NOT NULL DEFAULT 'DRAFT',
    "approverUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "scheduleConflictCount" INTEGER NOT NULL DEFAULT 0,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrLeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrLeaveLedgerEntry" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "HrLeaveType" NOT NULL,
    "entryType" "HrLeaveLedgerEntryType" NOT NULL,
    "minutes" INTEGER NOT NULL,
    "leaveRequestId" TEXT,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrLeaveLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPayslip" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'SGD',
    "basicSalaryCents" INTEGER NOT NULL DEFAULT 0,
    "allowanceCents" INTEGER NOT NULL DEFAULT 0,
    "deductionCents" INTEGER NOT NULL DEFAULT 0,
    "employeeCpfCents" INTEGER NOT NULL DEFAULT 0,
    "employerCpfCents" INTEGER NOT NULL DEFAULT 0,
    "reimbursementCents" INTEGER NOT NULL DEFAULT 0,
    "grossPayCents" INTEGER NOT NULL DEFAULT 0,
    "netPayCents" INTEGER NOT NULL DEFAULT 0,
    "status" "HrPayslipStatus" NOT NULL DEFAULT 'DRAFT',
    "preparedById" TEXT NOT NULL,
    "hrVerifiedById" TEXT,
    "hrVerifiedAt" TIMESTAMP(3),
    "financeConfirmedById" TEXT,
    "financeConfirmedAt" TIMESTAMP(3),
    "directorApprovedById" TEXT,
    "directorApprovedAt" TIMESTAMP(3),
    "paidById" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPayslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPayslipLine" (
    "id" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrPayslipLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HrLegalEntity_name_key" ON "HrLegalEntity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_userId_key" ON "EmployeeProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_teacherId_key" ON "EmployeeProfile"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_employeeNo_key" ON "EmployeeProfile"("employeeNo");

-- CreateIndex
CREATE INDEX "EmployeeProfile_legalEntityId_employmentStatus_idx" ON "EmployeeProfile"("legalEntityId", "employmentStatus");

-- CreateIndex
CREATE INDEX "EmployeeProfile_managerUserId_employmentStatus_idx" ON "EmployeeProfile"("managerUserId", "employmentStatus");

-- CreateIndex
CREATE INDEX "EmployeeProfile_workPassExpiry_idx" ON "EmployeeProfile"("workPassExpiry");

-- CreateIndex
CREATE INDEX "EmployeeProfile_passportExpiry_idx" ON "EmployeeProfile"("passportExpiry");

-- CreateIndex
CREATE INDEX "HrChecklistItem_status_dueDate_idx" ON "HrChecklistItem"("status", "dueDate");

-- CreateIndex
CREATE INDEX "HrChecklistItem_ownerUserId_status_idx" ON "HrChecklistItem"("ownerUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HrChecklistItem_employeeId_code_key" ON "HrChecklistItem"("employeeId", "code");

-- CreateIndex
CREATE INDEX "HrDocument_employeeId_category_status_idx" ON "HrDocument"("employeeId", "category", "status");

-- CreateIndex
CREATE INDEX "HrDocument_legalEntityId_category_idx" ON "HrDocument"("legalEntityId", "category");

-- CreateIndex
CREATE INDEX "HrDocument_expiresAt_status_idx" ON "HrDocument"("expiresAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HrDocument_employeeId_category_fileHash_key" ON "HrDocument"("employeeId", "category", "fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "HrLeavePolicy_legalEntityId_leaveType_key" ON "HrLeavePolicy"("legalEntityId", "leaveType");

-- CreateIndex
CREATE INDEX "HrLeaveRequest_employeeId_status_startAt_idx" ON "HrLeaveRequest"("employeeId", "status", "startAt");

-- CreateIndex
CREATE INDEX "HrLeaveRequest_approverUserId_status_submittedAt_idx" ON "HrLeaveRequest"("approverUserId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "HrLeaveRequest_startAt_endAt_status_idx" ON "HrLeaveRequest"("startAt", "endAt", "status");

-- CreateIndex
CREATE INDEX "HrLeaveLedgerEntry_employeeId_leaveType_createdAt_idx" ON "HrLeaveLedgerEntry"("employeeId", "leaveType", "createdAt");

-- CreateIndex
CREATE INDEX "HrLeaveLedgerEntry_expiresAt_idx" ON "HrLeaveLedgerEntry"("expiresAt");

-- CreateIndex
CREATE INDEX "HrPayslip_legalEntityId_month_status_idx" ON "HrPayslip"("legalEntityId", "month", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HrPayslip_employeeId_month_key" ON "HrPayslip"("employeeId", "month");

-- CreateIndex
CREATE INDEX "HrPayslipLine_payslipId_sortOrder_idx" ON "HrPayslipLine"("payslipId", "sortOrder");

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "HrLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrChecklistItem" ADD CONSTRAINT "HrChecklistItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrChecklistItem" ADD CONSTRAINT "HrChecklistItem_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrChecklistItem" ADD CONSTRAINT "HrChecklistItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "HrDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrChecklistItem" ADD CONSTRAINT "HrChecklistItem_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocument" ADD CONSTRAINT "HrDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocument" ADD CONSTRAINT "HrDocument_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "HrLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocument" ADD CONSTRAINT "HrDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocument" ADD CONSTRAINT "HrDocument_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrLeavePolicy" ADD CONSTRAINT "HrLeavePolicy_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "HrLegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrLeaveRequest" ADD CONSTRAINT "HrLeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrLeaveRequest" ADD CONSTRAINT "HrLeaveRequest_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrLeaveLedgerEntry" ADD CONSTRAINT "HrLeaveLedgerEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrLeaveLedgerEntry" ADD CONSTRAINT "HrLeaveLedgerEntry_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "HrLeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrLeaveLedgerEntry" ADD CONSTRAINT "HrLeaveLedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayslip" ADD CONSTRAINT "HrPayslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayslip" ADD CONSTRAINT "HrPayslip_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "HrLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayslip" ADD CONSTRAINT "HrPayslip_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayslip" ADD CONSTRAINT "HrPayslip_hrVerifiedById_fkey" FOREIGN KEY ("hrVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayslip" ADD CONSTRAINT "HrPayslip_financeConfirmedById_fkey" FOREIGN KEY ("financeConfirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayslip" ADD CONSTRAINT "HrPayslip_directorApprovedById_fkey" FOREIGN KEY ("directorApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayslip" ADD CONSTRAINT "HrPayslip_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayslipLine" ADD CONSTRAINT "HrPayslipLine_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "HrPayslip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
