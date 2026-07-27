import assert from "node:assert/strict";
import test from "node:test";
import { ageOnJanuaryFirst, assessSchoolGuidePath } from "../lib/school-guide-assessment";

test("calculates age on 1 January of entry year", () => {
  assert.equal(ageOnJanuaryFirst("2020-07-15", 2027), 6);
  assert.equal(ageOnJanuaryFirst("2014-01-01", 2027), 13);
});

test("international student age six receives P1 and international alternatives when unsure", () => {
  const result = assessSchoolGuidePath({
    birthDate: "2020-07-15",
    targetEntryYear: 2027,
    residency: "IS",
    preferredSystem: "UNSURE",
  });
  assert.ok(result.pathwaySlugs.includes("moe-p1-international"));
  assert.ok(result.pathwaySlugs.includes("international-school-direct"));
});

test("secondary-age international student receives AEIS secondary route without guaranteed grade", () => {
  const result = assessSchoolGuidePath({
    birthDate: "2013-05-10",
    targetEntryYear: 2027,
    residency: "IS",
    preferredSystem: "MOE",
  });
  assert.ok(result.pathwaySlugs.includes("aeis-secondary"));
  assert.match(result.notices.join(" "), /MOE当年度出生日期表/);
});
