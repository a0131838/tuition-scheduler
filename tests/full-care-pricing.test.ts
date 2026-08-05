import assert from "node:assert/strict";
import test from "node:test";
import {
  FULL_CARE_PRICING_PLANS,
  fullCarePricingPlan,
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
