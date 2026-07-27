import assert from "node:assert/strict";
import test from "node:test";
import { getOfficialSource, schoolGuideSchools } from "../lib/school-guide-data";

const firstTierNames = [
  "Singapore American School",
  "Dulwich College (Singapore)",
  "United World College of South East Asia",
  "Tanglin Trust School",
  "North London Collegiate School (Singapore)",
];

const secondBatchNames = [
  "Stamford American International School",
  "Canadian International School, Lakeside Campus",
  "Australian International School Pte Ltd",
  "One World International School Pte Ltd",
  "St. Joseph's Institution International Ltd",
  "German European School Singapore",
  "International French School (Singapore)",
  "Hwa Chong International School",
  "ISS International School Singapore",
  "Overseas Family School",
];

const verifiedSchoolNames = [...firstTierNames, ...secondBatchNames];

test("all five first-tier schools have structured official detail", () => {
  for (const name of firstTierNames) {
    const school = schoolGuideSchools.find((item) => item.name === name);
    assert.ok(school, `${name} should exist`);
    assert.equal(school.editorialTier, 1);
    assert.ok(school.officialWebsiteUrl);
    assert.ok((school.detailSections?.length ?? 0) >= 3, `${name} should have at least three detail sections`);
    assert.ok(school.sourceIds.length >= 3, `${name} should cite official sources`);
  }
});

test("the second batch of ten schools has structured official detail", () => {
  for (const name of secondBatchNames) {
    const school = schoolGuideSchools.find((item) => item.name === name);
    assert.ok(school, `${name} should exist`);
    assert.equal(school.dataStatus, "VERIFIED");
    assert.ok(school.officialWebsiteUrl);
    assert.ok((school.detailSections?.length ?? 0) >= 3, `${name} should have at least three detail sections`);
    assert.ok(school.comparison, `${name} should have normalized comparison facts`);
    assert.ok(school.costProfile, `${name} should have a first-year cost profile`);
    assert.ok(school.sourceIds.length >= 2, `${name} should cite official sources`);
  }
});

test("all fifteen verified schools have a valid review and cost profile", () => {
  for (const name of verifiedSchoolNames) {
    const school = schoolGuideSchools.find((item) => item.name === name);
    assert.ok(school, `${name} should exist`);
    assert.equal(school.dataStatus, "VERIFIED");
    assert.equal(school.verifiedAt, "2026-07-27");
    assert.ok(school.nextReviewAt, `${name} should have a next review date`);
    assert.ok(school.applicableYear, `${name} should identify the applicable fee year`);
    assert.ok(school.lastChangeSummary, `${name} should record the latest data change`);
    assert.ok(school.costProfile, `${name} should have cost data`);
    assert.ok(school.costProfile.fixedFirstYearLow > 0);
    assert.ok(school.costProfile.fixedFirstYearHigh >= school.costProfile.fixedFirstYearLow);
    assert.ok(school.costProfile.includes.length > 0);
    assert.ok(school.costProfile.optionalItems.length > 0);
  }
});

test("every school source id resolves to a recorded official source", () => {
  for (const school of schoolGuideSchools) {
    for (const sourceId of school.sourceIds) {
      assert.ok(getOfficialSource(sourceId), `${school.name} has unresolved source ${sourceId}`);
    }
  }
});

test("current first-tier fee details use the 2026/27 school year", () => {
  for (const name of firstTierNames) {
    const school = schoolGuideSchools.find((item) => item.name === name);
    const details = school?.detailSections?.flatMap((section) => [section.title, ...section.items]).join(" ") ?? "";
    assert.match(details, /2026\/27/, `${name} should show the applicable fee year`);
  }
});
