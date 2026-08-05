import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { careOwnerRolesForProgram } from "../lib/care-management";
import {
  CARE_PROGRAM_DEFAULT_SCOPE_IDS,
  CARE_PROGRAM_OPTIONS,
  assertCareActivityProgramType,
  assertCareUniversityConsent,
  assertCareUniversityProfileReady,
  careActivityOptionsForProgram,
  careScopeOptionsForProgram,
  isUniversityCareProgram,
} from "../lib/care-validation";

test("university care has three distinct programme types", () => {
  assert.equal(CARE_PROGRAM_OPTIONS.some((item) => item.value === "UNIVERSITY_GROWTH"), true);
  assert.equal(CARE_PROGRAM_OPTIONS.some((item) => item.value === "POSTGRAD_PREPARATION"), true);
  assert.equal(CARE_PROGRAM_OPTIONS.some((item) => item.value === "CAREER_LAUNCH"), true);
  assert.equal(isUniversityCareProgram("PRE_U_FULL_COORDINATION"), false);
  assert.equal(isUniversityCareProgram("POSTGRAD_PREPARATION"), true);
});

test("pre-university products and university tracks each keep the correct default scope", () => {
  const comprehensiveDefaults = [
    "academic_management",
    "school_coordination",
    "weekly_wellbeing",
    "medical_accompaniment",
    "important_transport",
    "host_family_support",
    "holiday_care",
    "visa_admin",
  ];
  assert.deepEqual(CARE_PROGRAM_DEFAULT_SCOPE_IDS.PRE_U_ACADEMIC_CARE, [
    "academic_management",
    "school_coordination",
    "weekly_wellbeing",
  ]);
  assert.deepEqual(CARE_PROGRAM_DEFAULT_SCOPE_IDS.PRE_U_FULL_COORDINATION, comprehensiveDefaults);
  assert.deepEqual(CARE_PROGRAM_DEFAULT_SCOPE_IDS.UNIVERSITY_GROWTH, [
    "university_semester_planning",
    "university_module_deadlines",
    "university_gpa_credits",
    "university_academic_risk",
    "university_faculty_coordination",
  ]);
  assert.equal(CARE_PROGRAM_DEFAULT_SCOPE_IDS.POSTGRAD_PREPARATION.includes("postgrad_application_tracking"), true);
  assert.equal(CARE_PROGRAM_DEFAULT_SCOPE_IDS.CAREER_LAUNCH.includes("career_opportunity_tracking"), true);
  assert.equal(CARE_PROGRAM_DEFAULT_SCOPE_IDS.CAREER_LAUNCH.includes("host_family_support"), false);
});

test("legacy selected scopes remain editable without becoming university defaults", () => {
  const options = careScopeOptionsForProgram("UNIVERSITY_GROWTH", ["host_family_support"]);
  assert.equal(options.some((item) => item.id === "host_family_support"), true);
  assert.equal(CARE_PROGRAM_DEFAULT_SCOPE_IDS.UNIVERSITY_GROWTH.includes("host_family_support"), false);
});

test("owner roles and update categories follow each university track", () => {
  assert.deepEqual(careOwnerRolesForProgram("PRE_U_FULL_COORDINATION"), ["CASE_OWNER", "ACADEMIC_OWNER", "SCHOOL_OWNER", "LIFE_OWNER"]);
  assert.deepEqual(careOwnerRolesForProgram("UNIVERSITY_GROWTH"), ["CASE_OWNER", "ACADEMIC_OWNER"]);
  assert.deepEqual(careOwnerRolesForProgram("POSTGRAD_PREPARATION"), ["CASE_OWNER", "ACADEMIC_OWNER", "COORDINATOR"]);
  assert.deepEqual(careOwnerRolesForProgram("CAREER_LAUNCH"), ["CASE_OWNER", "COORDINATOR"]);
  assert.deepEqual(careActivityOptionsForProgram("CAREER_LAUNCH").map((item) => item.value), ["PARENT", "RISK", "CAREER", "GENERAL"]);
  assert.doesNotThrow(() => assertCareActivityProgramType("POSTGRAD_PREPARATION", "APPLICATION"));
  assert.throws(() => assertCareActivityProgramType("CAREER_LAUNCH", "LIFE"), /not available/);
});

test("student consent requires evidence and explicit parent-visible sections", () => {
  assert.doesNotThrow(() => assertCareUniversityConsent({ status: "NOT_RECORDED", parentVisibilityIds: [], consentNote: "" }));
  assert.throws(
    () => assertCareUniversityConsent({ status: "LIMITED", parentVisibilityIds: [], consentNote: "Student signed" }),
    /parent-visible section/,
  );
  assert.throws(
    () => assertCareUniversityConsent({ status: "GRANTED", parentVisibilityIds: ["academic_progress"], consentNote: "" }),
    /Consent record/,
  );
  assert.doesNotThrow(() => assertCareUniversityConsent({
    status: "LIMITED",
    parentVisibilityIds: ["academic_progress"],
    consentNote: "Student confirmed by signed form",
  }));
});

test("university projects require an academic position before activation", () => {
  assert.throws(() => assertCareUniversityProfileReady({
    institution: "NUS",
    degreeProgram: "Computer Science",
    currentTerm: null,
    expectedGraduationDate: new Date("2029-06-30"),
  }), /required before activation/);
  assert.doesNotThrow(() => assertCareUniversityProfileReady({
    institution: "NUS",
    degreeProgram: "Computer Science",
    currentTerm: "Year 1 Semester 1",
    expectedGraduationDate: new Date("2029-06-30"),
  }));
});

test("university profile migration is additive and isolated from protected workflows", async () => {
  const migration = await readFile(
    new URL("../prisma/migrations/20260714113000_add_care_university_profiles/migration.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /ADD VALUE IF NOT EXISTS 'POSTGRAD_PREPARATION'/);
  assert.match(migration, /CREATE TABLE "CareUniversityProfile"/);
  for (const table of ["Student", "CoursePackage", "Session", "Attendance", "PartnerSettlement", "Invoice", "Receipt"]) {
    assert.doesNotMatch(migration, new RegExp(`(?:ALTER|DROP|TRUNCATE|UPDATE|DELETE\\s+FROM)\\s+TABLE?\\s+"${table}"`, "i"));
  }
  assert.doesNotMatch(migration, /\bDROP\s+(?:TABLE|COLUMN|TYPE|INDEX)\b/i);
  assert.doesNotMatch(migration, /\bUPDATE\s+"/i);
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\b/i);
});
