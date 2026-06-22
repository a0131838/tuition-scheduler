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

test("student contract snapshots can use the SSG standard PEI contract mode", () => {
  const { snapshot } = buildStudentContractSnapshot({
    studentId: "student-1",
    studentName: "Student A",
    packageId: "package-1",
    businessInfo,
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
