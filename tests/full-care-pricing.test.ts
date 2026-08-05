import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  assertFullCareCourseAssignmentsMatchPlans,
  assertFullCarePricingPlanMatchesCourses,
  FULL_CARE_PRICING_PLANS,
  fullCareRequiresIbApTier,
  fullCarePricingPlan,
  isIbApCourseName,
  requireFullCarePricingPlan,
  validateFullCareSpecialDiscount,
} from "../lib/full-care-pricing";

test("academic-care standard pricing applies whole-bundle discounts", () => {
  const standard200 = requireFullCarePricingPlan("FC2026_ACADEMIC_STANDARD_200");
  const standard300 = requireFullCarePricingPlan("FC2026_ACADEMIC_STANDARD_300");
  assert.deepEqual(
    [standard200.listFee, standard200.discountRate, standard200.tuitionFee, standard200.careServiceFee, standard200.totalFee],
    [41_560, 0.05, 27_340, 12_160, 39_500]
  );
  assert.deepEqual(
    [standard300.listFee, standard300.discountRate, standard300.tuitionFee, standard300.careServiceFee, standard300.totalFee],
    [55_940, 0.08, 39_724, 11_776, 51_500]
  );
});

test("IB/AP Full Care pricing is a separate premium tier", () => {
  const ibAp200 = requireFullCarePricingPlan("FC2026_COORD_IB_AP_200");
  const ibAp300 = requireFullCarePricingPlan("FC2026_COORD_IB_AP_300");
  assert.deepEqual(
    [ibAp200.tuitionFee, ibAp200.careServiceFee, ibAp200.totalFee],
    [47_080, 18_620, 65_700]
  );
  assert.deepEqual(
    [ibAp300.tuitionFee, ibAp300.careServiceFee, ibAp300.totalFee],
    [68_468, 18_032, 86_500]
  );
});

test("Full Care pricing exposes exactly twelve versioned current plans and reads legacy snapshots", () => {
  assert.equal(FULL_CARE_PRICING_PLANS.length, 12);
  assert.deepEqual([...new Set(FULL_CARE_PRICING_PLANS.map((plan) => plan.hours))], [100, 200, 300]);
  assert.equal(fullCarePricingPlan("STANDARD_200")?.totalFee, 41_560);
  assert.equal(fullCarePricingPlan("OLEVEL_200"), null);
  assert.throws(() => requireFullCarePricingPlan("STANDARD_200"), /valid current Full Care pricing plan/);
});

test("all twelve published totals and component splits are frozen", () => {
  assert.deepEqual(
    FULL_CARE_PRICING_PLANS.map((plan) => [plan.programType, plan.tier, plan.hours, plan.totalFee]),
    [
      ["PRE_U_ACADEMIC_CARE", "STANDARD", 100, 27_180],
      ["PRE_U_ACADEMIC_CARE", "STANDARD", 200, 39_500],
      ["PRE_U_ACADEMIC_CARE", "STANDARD", 300, 51_500],
      ["PRE_U_ACADEMIC_CARE", "IB_AP", 100, 37_600],
      ["PRE_U_ACADEMIC_CARE", "IB_AP", 200, 59_300],
      ["PRE_U_ACADEMIC_CARE", "IB_AP", 300, 80_200],
      ["PRE_U_FULL_COORDINATION", "STANDARD", 100, 33_980],
      ["PRE_U_FULL_COORDINATION", "STANDARD", 200, 45_900],
      ["PRE_U_FULL_COORDINATION", "STANDARD", 300, 57_700],
      ["PRE_U_FULL_COORDINATION", "IB_AP", 100, 44_400],
      ["PRE_U_FULL_COORDINATION", "IB_AP", 200, 65_700],
      ["PRE_U_FULL_COORDINATION", "IB_AP", 300, 86_500],
    ],
  );
  for (const plan of FULL_CARE_PRICING_PLANS) {
    assert.equal(plan.tuitionFee + plan.careServiceFee, plan.totalFee);
    assert.equal(plan.listFee - plan.bundleSavings, plan.totalFee);
  }
});

test("management special discount is capped, requires a reason and remains separate", () => {
  assert.deepEqual(validateFullCareSpecialDiscount(39_500, 1_000, "Sibling loyalty"), { amount: 1_000, reason: "Sibling loyalty" });
  assert.throws(() => validateFullCareSpecialDiscount(39_500, 1_000, ""), /reason/i);
  assert.throws(() => validateFullCareSpecialDiscount(39_500, 6_000, "CEO offer"), /cannot exceed 15%/i);
});

test("IB/AP course detection covers current and future course naming", () => {
  assert.equal(isIbApCourseName("IB"), true);
  assert.equal(isIbApCourseName("IBDP Mathematics"), true);
  assert.equal(isIbApCourseName("IB/AP mixed programme"), true);
  assert.equal(isIbApCourseName("AP Calculus"), true);
  assert.equal(isIbApCourseName("Advanced Placement Chemistry"), true);
  assert.equal(isIbApCourseName("International Baccalaureate Biology"), true);
  assert.equal(isIbApCourseName("IGCSE"), false);
  assert.equal(isIbApCourseName("Standardized English Tests"), false);
  assert.equal(fullCareRequiresIbApTier(["Olevel", "IB"]), true);
});

test("a package containing IB/AP cannot generate a standard Full Care contract", () => {
  assert.throws(
    () => assertFullCarePricingPlanMatchesCourses("FC2026_ACADEMIC_STANDARD_200", ["Olevel", "IB"], "PRE_U_ACADEMIC_CARE"),
    /select an IB\/AP Full Care price plan/i
  );
  assert.equal(assertFullCarePricingPlanMatchesCourses("FC2026_ACADEMIC_IB_AP_200", ["Olevel", "IB"], "PRE_U_ACADEMIC_CARE").tier, "IB_AP");
  assert.equal(assertFullCarePricingPlanMatchesCourses("FC2026_ACADEMIC_STANDARD_300", ["Olevel"], "PRE_U_ACADEMIC_CARE").tier, "STANDARD");
  assert.throws(
    () => assertFullCarePricingPlanMatchesCourses("FC2026_COORD_STANDARD_200", ["Olevel"], "PRE_U_ACADEMIC_CARE"),
    /must match.*care project type/i,
  );
});

test("contract preparation enforces the IB/AP tier from primary and shared package courses", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/admin/packages/[id]/contract/page.tsx"),
    "utf8"
  );
  assert.match(source, /sharedCourses: \{ select: \{ course: \{ select: \{ name: true \} \} \} \}/);
  assert.match(source, /assertFullCarePricingPlanMatchesCourses\([\s\S]*?packageCourseNames\)/);
  assert.match(source, /Standard plans are blocked/);
});

test("an active standard Full Care contract blocks later IB/AP course assignment", () => {
  assert.throws(
    () => assertFullCareCourseAssignmentsMatchPlans(["Olevel", "IB"], ["FC2026_ACADEMIC_STANDARD_200"]),
    /active standard-tier Full Care contract/i
  );
  assert.doesNotThrow(() =>
    assertFullCareCourseAssignmentsMatchPlans(["Olevel", "IB"], ["FC2026_ACADEMIC_IB_AP_200"])
  );
  assert.doesNotThrow(() =>
    assertFullCareCourseAssignmentsMatchPlans(["Olevel"], ["FC2026_ACADEMIC_STANDARD_200"])
  );
});

test("package editing enforces the signed Full Care tier before saving course assignments", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/api/admin/packages/[id]/route.ts"),
    "utf8"
  );
  assert.match(source, /contracts: \{[\s\S]*?status: \{ not: "VOID" \}/);
  assert.match(source, /assertFullCareCourseAssignmentsMatchPlans\([\s\S]*?activeFullCarePlanValues/);
  assert.match(source, /Full Care price tier does not match the package courses/);
});

test("care project activation accepts only a signed contract bound to the same project and type", () => {
  const source = readFileSync(path.join(process.cwd(), "lib/care-management.ts"), "utf8");
  assert.match(source, /info\.careEngagementId === engagement\.id/);
  assert.match(source, /info\.careProgramType === engagement\.programType/);
});
