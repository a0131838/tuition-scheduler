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
} from "../lib/full-care-pricing";

test("Full Care pricing uses one standard tier for non-IB/AP courses", () => {
  const standard200 = requireFullCarePricingPlan("STANDARD_200");
  const standard300 = requireFullCarePricingPlan("STANDARD_300");
  assert.deepEqual(
    [standard200.tuitionFee, standard200.careServiceFee, standard200.totalFee],
    [28_760, 12_800, 41_560]
  );
  assert.deepEqual(
    [standard300.tuitionFee, standard300.careServiceFee, standard300.totalFee],
    [43_140, 12_800, 55_940]
  );
});

test("IB/AP Full Care pricing is a separate premium tier", () => {
  const ibAp200 = requireFullCarePricingPlan("IB_AP_200");
  const ibAp300 = requireFullCarePricingPlan("IB_AP_300");
  assert.deepEqual(
    [ibAp200.tuitionFee, ibAp200.careServiceFee, ibAp200.totalFee],
    [49_600, 12_800, 62_400]
  );
  assert.deepEqual(
    [ibAp300.tuitionFee, ibAp300.careServiceFee, ibAp300.totalFee],
    [74_400, 12_800, 87_200]
  );
});

test("Full Care pricing accepts only the four approved plans", () => {
  assert.equal(FULL_CARE_PRICING_PLANS.length, 4);
  assert.equal(fullCarePricingPlan("OLEVEL_200"), null);
  assert.throws(() => requireFullCarePricingPlan("CUSTOM"), /valid Full Care pricing plan/);
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
    () => assertFullCarePricingPlanMatchesCourses("STANDARD_200", ["Olevel", "IB"]),
    /select an IB\/AP Full Care price plan/i
  );
  assert.equal(assertFullCarePricingPlanMatchesCourses("IB_AP_200", ["Olevel", "IB"]).tier, "IB_AP");
  assert.equal(assertFullCarePricingPlanMatchesCourses("STANDARD_300", ["Olevel"]).tier, "STANDARD");
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
    () => assertFullCareCourseAssignmentsMatchPlans(["Olevel", "IB"], ["STANDARD_200"]),
    /active standard-tier Full Care contract/i
  );
  assert.doesNotThrow(() =>
    assertFullCareCourseAssignmentsMatchPlans(["Olevel", "IB"], ["IB_AP_200"])
  );
  assert.doesNotThrow(() =>
    assertFullCareCourseAssignmentsMatchPlans(["Olevel"], ["STANDARD_200"])
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
