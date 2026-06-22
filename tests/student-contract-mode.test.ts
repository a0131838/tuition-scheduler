import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SSG_STANDARD_PEI_CONTRACT_TEMPLATE_SLUG,
  STUDENT_CONTRACT_TEMPLATE_SLUG,
  buildStudentContractSnapshot,
} from "../lib/student-contract-template";

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
  assert.match(snapshot.agreementHtml, /SSG Standard PEI-Student Contract v4\.0/);
  assert.match(snapshot.agreementHtml, /7 working days/);
});
