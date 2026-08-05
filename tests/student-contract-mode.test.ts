import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SSG_STANDARD_PEI_CONTRACT_TEMPLATE_SLUG,
  STUDENT_CONTRACT_TEMPLATE_SLUG,
  buildStudentContractSnapshot,
  getStudentContractTemplateInput,
} from "../lib/student-contract-template";
import {
  SSG_STANDARD_PEI_CONTRACT_V4_OFFICIAL_VERSION,
  SSG_STANDARD_PEI_CONTRACT_V4_SOURCE_DOCX_URL,
  SSG_STANDARD_PEI_CONTRACT_V4_SOURCE_URL,
} from "../lib/ssg-standard-pei-contract-v4";

const parentInfo = {
  parentFullNameEn: "Parent A",
  parentFullNameZh: null,
  phone: "+65 9000 0000",
  email: "parent@example.com",
  address: "Singapore",
  relationshipToStudent: "Parent",
  isLegalGuardian: true,
};

const businessInfo = {
  courseName: "Preparatory Course for AEIS Admission",
  packageType: "HOURS",
  totalMinutes: 3600,
  feeAmount: 1200,
  billTo: "Parent A",
  agreementDateIso: "2026-06-22",
  lessonMode: "One-to-one",
  campusName: null,
  contractTypeLabel: "EduTrust PEI-Student Contract",
};

const ssgBusinessInfo = {
  ...businessInfo,
  courseCommencementDateIso: "2026-07-01",
  courseCompletionDateIso: "2026-09-30",
  permittedCourseDurationMonths: "3 months",
  courseLoadMode: "Part-time",
  studyCommencementDate: "N.A.",
  qualification: "Certificate of Completion",
  courseDeveloper: "GT Educational Institute Pte. Ltd.",
  awardingOrganisation: "GT Educational Institute Pte. Ltd.",
  courseEntryRequirements: "Placement interview and diagnostic assessment",
  courseSchedule: "50 hours of one-to-one lessons with diagnostic, progress, and final assessment",
  scheduledHolidays: "Singapore public holidays and school closure dates",
  assessmentPeriods: "Diagnostic assessment at intake, progress review mid-course, final assessment at completion",
  finalResultsReleaseDate: "Within 7 working days after final assessment",
  qualificationConfermentDate: "Upon successful course completion",
  industrialAttachmentIncluded: false,
  industrialAttachmentDuration: "N.A.",
  miscellaneousFees: "N.A.",
  refundEvent1Percent: "100%",
  refundEvent1DaysBefore: "30",
  refundEvent2Percent: "50%",
  refundEvent2DaysBefore: "7",
  refundEvent3Percent: "20%",
  refundEvent3DaysAfter: "7",
  refundEvent4Percent: "0%",
  refundEvent4DaysAfter: "7",
  latePaymentGraceValue: "7",
  latePaymentGraceUnit: "days",
};

test("student contract snapshots default to the existing tuition agreement mode", () => {
  const { snapshot } = buildStudentContractSnapshot({
    studentId: "student-1",
    studentName: "Student A",
    packageId: "package-1",
    businessInfo,
    parentInfo,
  });

  assert.equal(snapshot.contractMode, "TUITION_AGREEMENT");
  assert.equal(snapshot.templateSlug, STUDENT_CONTRACT_TEMPLATE_SLUG);
});

test("Full Care agreement is course-independent and freezes the selected tuition price tier", () => {
  const { snapshot } = buildStudentContractSnapshot({
    studentId: "student-care",
    studentName: "Student Care",
    packageId: "package-care",
    businessInfo: {
      ...businessInfo,
      feeAmount: 41560,
      totalMinutes: 12000,
      careServiceIncluded: true,
      carePricingPlan: "STANDARD_200",
      careProgramLabel: "Full Care / 全程托管",
      courseName: "Full Care + 200h standard tuition / 全程托管 + 200小时标准课程",
      packageType: "200-hour Full Care package / 200小时全程托管课包",
      contractTypeLabel: "Full Care Service Agreement / 全程托管服务合同",
      tuitionFeeAmount: 28760,
      careServiceFeeAmount: 12800,
      careServiceStartDateIso: "2026-08-10",
      careServiceEndDateIso: "2027-08-09",
      careUpdateCadence: "Weekly service review / 每周服务复核",
      careReportCadence: "Monthly formal report / 每月正式报告",
      careDeliveryChannel: "Parent miniapp / 家长小程序",
      careEmergencyAdvanceLimit: 300,
      careScopeLabels: ["School communication / 学校沟通", "Academic progress / 学业进展"],
      careExclusionLabels: ["Legal guardianship / 法定监护"],
    },
    parentInfo,
  });

  assert.equal(snapshot.care?.included, true);
  assert.equal(snapshot.care?.careServiceFeeAmount, 12800);
  assert.match(snapshot.agreementHtml, /Full Care Service Agreement/);
  assert.match(snapshot.agreementHtml, /全程托管服务合同/);
  assert.match(snapshot.agreementHtml, /200h standard tuition/);
  assert.match(snapshot.agreementHtml, /家长可见范围/);
  assert.match(snapshot.agreementHtml, /School communication/);
  assert.match(snapshot.agreementHtml, /SGD 12800\.00/);
  assert.match(snapshot.agreementHtml, /SGD 300\.00/);
  assert.doesNotMatch(snapshot.agreementHtml, /O Level|Olevel/);
  assert.doesNotMatch(snapshot.agreementHtml, /commission|佣金/i);
});

test("student contract snapshots can use the SSG standard PEI contract mode", () => {
  const { snapshot } = buildStudentContractSnapshot({
    studentId: "student-1",
    studentName: "Student A",
    packageId: "package-1",
    businessInfo: ssgBusinessInfo,
    parentInfo,
    contractMode: "SSG_STANDARD_PEI_V4",
  });

  assert.equal(snapshot.contractMode, "SSG_STANDARD_PEI_V4");
  assert.equal(snapshot.templateSlug, SSG_STANDARD_PEI_CONTRACT_TEMPLATE_SLUG);
  assert.match(snapshot.agreementHtml, /PRIVATE EDUCATION INSTITUTION-STUDENT CONTRACT/);
  assert.match(snapshot.agreementHtml, /ten \(10\) calendar days/);
  assert.match(snapshot.agreementHtml, /seven \(7\) working days/);
  assert.match(snapshot.agreementHtml, /SCHEDULE A/);
  assert.match(snapshot.agreementHtml, /SCHEDULE B/);
  assert.match(snapshot.agreementHtml, /SCHEDULE C/);
  assert.match(snapshot.agreementHtml, /SCHEDULE D/);
  assert.match(snapshot.agreementHtml, /SCHEDULE E/);
  assert.ok(snapshot.agreementHtml.includes("GT Educational Institute Pte. Ltd."));
  assert.ok(snapshot.agreementHtml.includes("202303312G"));
  assert.match(snapshot.agreementHtml, /3 months/);
  assert.match(snapshot.agreementHtml, /01\/07\/2026/);
  assert.match(snapshot.agreementHtml, /30\/09\/2026/);
  assert.match(snapshot.agreementHtml, /100%/);
  assert.match(snapshot.agreementHtml, /more than 30 working days before/);
  assert.match(snapshot.agreementHtml, /7 days after the scheduled due date/);
});

test("SSG standard PEI template is locked to official v4 source metadata", () => {
  const template = getStudentContractTemplateInput("SSG_STANDARD_PEI_V4");
  assert.equal((template as any).sourceVersion, SSG_STANDARD_PEI_CONTRACT_V4_OFFICIAL_VERSION);
  assert.equal((template as any).sourceUrl, SSG_STANDARD_PEI_CONTRACT_V4_SOURCE_URL);
  assert.equal((template as any).sourceDocxUrl, SSG_STANDARD_PEI_CONTRACT_V4_SOURCE_DOCX_URL);
  assert.equal((template as any).lockedOfficialTemplate, true);
  assert.equal((template.bodyHtml.match(/REFUND EVENTS/g) ?? []).length, 1);
  assert.doesNotMatch(template.bodyHtml, /REFUND EVENTSREFUND EVENTS/);
});
