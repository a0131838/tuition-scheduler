import assert from "node:assert/strict";
import test from "node:test";
import { schoolGuideSchools } from "../lib/school-guide-data";
import { matchSchoolGuideSchools, selectBalancedSchoolGuideMatches } from "../lib/school-guide-match";

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

test("balanced selection does not reward elite schools just for reputation", () => {
  const matches = matchSchoolGuideSchools(schoolGuideSchools, {
    budgetMax: 50000,
    curriculum: "IB",
    englishSupportNeeded: true,
    boardingNeeded: false,
    currentSchoolType: "OVERSEAS_LOCAL",
    currentCurriculum: "CHINA",
    academicLevel: "DEVELOPING",
  });
  const elite = matches.filter((item) => item.school.editorialTier === 1);
  assert.ok(elite.length > 0);
  assert.ok(elite.every((item) => item.band === "REACH"));
  assert.ok(elite.every((item) => item.score < 10));
});

test("balanced shortlist contains distinct practical tiers and assessment evidence", () => {
  const shortlist = selectBalancedSchoolGuideMatches(matchSchoolGuideSchools(schoolGuideSchools, {
    budgetMax: 70000,
    curriculum: "ANY",
    englishSupportNeeded: false,
    boardingNeeded: false,
    currentSchoolType: "INTERNATIONAL",
    currentCurriculum: "IB",
    academicLevel: "ON_LEVEL",
    assessmentScore: 68,
  }));
  assert.equal(shortlist.length, 8);
  assert.ok(new Set(shortlist.map((item) => item.band)).size >= 2);
  assert.ok(shortlist.every((item) => item.reasons.some((reason) => reason.includes("系统测评 68 分"))));
  assert.ok(shortlist.every((item) => item.bandLabel !== undefined));
});
