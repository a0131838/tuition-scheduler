import assert from "node:assert/strict";
import test from "node:test";
import { careContractStringArray } from "../lib/care-contract-input";

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
