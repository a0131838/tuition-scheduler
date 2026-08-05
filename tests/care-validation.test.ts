import assert from "node:assert/strict";
import test from "node:test";
import {
  CARE_SCOPE_OPTIONS,
  assertCareActivation,
  assertCareLaunchReadiness,
  assertCareActivity,
  assertCareStatusTransition,
  assertCareTaskUpdate,
  careScopeIds,
  parseCareDateTime,
} from "../lib/care-validation";

test("default full-care scope includes confirmed services but excludes conditional services", () => {
  const defaults: string[] = CARE_SCOPE_OPTIONS.filter((item) => item.defaultOn).map((item) => item.id);
  assert.deepEqual(defaults, [
    "academic_management",
    "school_coordination",
    "weekly_wellbeing",
    "medical_accompaniment",
    "important_transport",
    "host_family_support",
    "holiday_care",
    "visa_admin",
  ]);
  assert.equal(defaults.includes("daily_status_check"), false);
  assert.equal(defaults.includes("after_hours_onsite"), false);
});

test("scope normalization ignores unknown values and preserves canonical order", () => {
  assert.deepEqual(careScopeIds(["visa_admin", "unknown", "academic_management", "visa_admin"]), [
    "academic_management",
    "visa_admin",
  ]);
});

test("care date-time input is interpreted in Singapore time", () => {
  assert.equal(parseCareDateTime("2026-07-13T09:30")?.toISOString(), "2026-07-13T01:30:00.000Z");
  assert.equal(parseCareDateTime("bad"), null);
});

test("activation requires date, scope and active case owner", () => {
  assert.throws(
    () => assertCareActivation({ startDate: null, caseOwnerUserId: "u1", scopeIds: ["academic_management"], hasActiveCaseOwner: true }),
    /Start date/,
  );
  assert.throws(
    () => assertCareActivation({ startDate: new Date(), caseOwnerUserId: "u1", scopeIds: [], hasActiveCaseOwner: true }),
    /service scope/,
  );
  assert.throws(
    () => assertCareActivation({ startDate: new Date(), caseOwnerUserId: "u1", scopeIds: ["academic_management"], hasActiveCaseOwner: false }),
    /case owner/,
  );
  assert.doesNotThrow(() =>
    assertCareActivation({ startDate: new Date(), caseOwnerUserId: "u1", scopeIds: ["academic_management"], hasActiveCaseOwner: true }),
  );
});

test("new Full Care activation requires signed agreement, parent access, reviewer and initial plan", () => {
  assert.throws(
    () => assertCareLaunchReadiness({
      hasSignedCareContract: false,
      hasParentReportAccess: false,
      hasReviewer: true,
      hasInitialPlan: false,
    }),
    /signed Full Care agreement.*parent miniapp binding.*initial service plan/,
  );
  assert.doesNotThrow(() => assertCareLaunchReadiness({
    hasSignedCareContract: true,
    hasParentReportAccess: true,
    hasReviewer: true,
    hasInitialPlan: true,
  }));
});

test("engagement status machine blocks reopening closed projects", () => {
  assert.doesNotThrow(() => assertCareStatusTransition("DRAFT", "ACTIVE"));
  assert.doesNotThrow(() => assertCareStatusTransition("ACTIVE", "PAUSED"));
  assert.doesNotThrow(() => assertCareStatusTransition("PAUSED", "ACTIVE"));
  assert.throws(() => assertCareStatusTransition("COMPLETED", "ACTIVE"), /Cannot change/);
  assert.throws(() => assertCareStatusTransition("CANCELLED", "ACTIVE"), /Cannot change/);
});

test("high-risk updates require owner, next action and due time", () => {
  assert.throws(
    () =>
      assertCareActivity({
        riskLevel: "HIGH",
        ownerUserId: null,
        nextAction: "Contact school",
        nextActionDue: new Date(),
        audience: "INTERNAL_ONLY",
        publicSummary: "",
      }),
    /High-risk/,
  );
  assert.doesNotThrow(() =>
    assertCareActivity({
      riskLevel: "CRITICAL",
      ownerUserId: "u1",
      nextAction: "Call emergency contact",
      nextActionDue: new Date(),
      audience: "INTERNAL_ONLY",
      publicSummary: "",
    }),
  );
});

test("parent-visible updates require a separate public summary", () => {
  assert.throws(
    () =>
      assertCareActivity({
        riskLevel: "LOW",
        ownerUserId: null,
        nextAction: "",
        nextActionDue: null,
        audience: "PARENT",
        publicSummary: "",
      }),
    /public summary/,
  );
});

test("task completion and external waiting require evidence or follow-up", () => {
  assert.throws(
    () => assertCareTaskUpdate({ status: "DONE", completionEvidence: "", nextFollowUpAt: null }),
    /Completion result/,
  );
  assert.throws(
    () => assertCareTaskUpdate({ status: "WAITING_EXTERNAL", completionEvidence: "", nextFollowUpAt: null }),
    /follow-up/,
  );
  assert.doesNotThrow(() =>
    assertCareTaskUpdate({ status: "DONE", completionEvidence: "School confirmed the meeting", nextFollowUpAt: null }),
  );
});
