import assert from "node:assert/strict";
import test from "node:test";
import { schoolGuideSchools } from "../lib/school-guide-data";
import { matchSchoolGuideSchools } from "../lib/school-guide-match";

test("school matching only recommends verified unique schools", () => {
  const matches = matchSchoolGuideSchools(schoolGuideSchools, {
    budgetMax: 70000,
    curriculum: "ANY",
    englishSupportNeeded: false,
    boardingNeeded: false,
  });
  assert.ok(matches.length >= 15);
  assert.equal(new Set(matches.map((item) => item.school.name)).size, matches.length);
  assert.ok(matches.every((item) => item.school.dataStatus === "VERIFIED"));
});

test("budget and boarding constraints become visible cautions", () => {
  const matches = matchSchoolGuideSchools(schoolGuideSchools, {
    budgetMax: 25000,
    curriculum: "IB",
    englishSupportNeeded: true,
    boardingNeeded: true,
  });
  assert.ok(matches.some((item) => item.cautions.some((text) => text.includes("预算"))));
  assert.ok(matches.some((item) => item.cautions.includes("学校不提供寄宿")));
  assert.ok(matches.every((item) => !JSON.stringify(item).includes("录取率")));
});
