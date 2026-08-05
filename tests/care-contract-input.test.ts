import assert from "node:assert/strict";
import test from "node:test";
import { careContractExclusionLabels, careContractStringArray } from "../lib/care-contract-input";

test("care contract input accepts the structured project scope format", () => {
  assert.deepEqual(
    careContractStringArray({ serviceIds: ["academic_management", "school_coordination"] }),
    ["academic_management", "school_coordination"]
  );
  assert.deepEqual(
    careContractStringArray({ items: ["third_party_costs", "medical_diagnosis"] }),
    ["third_party_costs", "medical_diagnosis"]
  );
});

test("care contract input remains compatible with legacy arrays and removes blanks", () => {
  assert.deepEqual(careContractStringArray([" academic_management ", "", null]), ["academic_management"]);
  assert.deepEqual(careContractStringArray(null), []);
});

test("care contract exclusions are parent-readable bilingual labels", () => {
  const labels = careContractExclusionLabels({
    items: ["third_party_costs", "medical_diagnosis", "immigration_legal_advice", "unlimited_onsite_support"],
  });
  assert.equal(labels.length, 4);
  assert.match(labels[0], /Third-party actual costs.*第三方实际费用/);
  assert.match(labels[3], /after-hours.*非工作时间/);
  assert.doesNotMatch(labels.join(" "), /third_party_costs|unlimited_onsite_support/);
});
