import assert from "node:assert/strict";
import test from "node:test";
import {
  getSchoolGuideInstitutionDirectoryGroup,
  schoolGuideOfficialInstitutions,
} from "../lib/school-guide-official-institutions";

test("five polytechnics have separate detailed profiles and truthful joint employment data", () => {
  const items = schoolGuideOfficialInstitutions.filter((item) => item.subcategory === "Polytechnic Institution");
  assert.equal(items.length, 5);
  assert.deepEqual(new Set(items.map((item) => item.badges.find((badge) => ["SP", "NP", "NYP", "TP", "RP"].includes(badge)))), new Set(["SP", "NP", "NYP", "TP", "RP"]));
  for (const item of items) {
    assert.equal(getSchoolGuideInstitutionDirectoryGroup(item), "polytechnics");
    assert.match(item.keyFacts.find((fact) => fact.label === "2025就业")?.value || "", /五校联合/);
    assert.match(item.sections.flatMap((section) => section.items).join(" "), /Diploma，不是Bachelor|Diploma/);
    assert.doesNotMatch(item.sourceNote, /单校就业率[^推]/);
  }
});
test("all six autonomous universities have ranking, employment and China application sections", () => {
  const items = schoolGuideOfficialInstitutions.filter((item) => ["University Research", "University Applied Design"].includes(item.subcategory));
  assert.equal(items.length, 6);
  for (const item of items) {
    const facts = new Map(item.keyFacts.map((fact) => [fact.label, fact.value]));
    assert.ok(facts.get("QS 2027"));
    assert.ok(facts.get("2025就业"));
    assert.ok(facts.get("月薪中位数"));
    assert.ok(item.sections.some((section) => section.title === "中国学生申请流程"));
    assert.ok(["research-universities", "applied-universities"].includes(getSchoolGuideInstitutionDirectoryGroup(item)));
  }
});

test("BCA Academy is separate from polytechnics and universities", () => {
  const item = schoolGuideOfficialInstitutions.find((profile) => profile.slug === "bca-academy");
  assert.ok(item);
  assert.equal(getSchoolGuideInstitutionDirectoryGroup(item), "bca-academy");
  assert.match(item.keyFacts.find((fact) => fact.label === "机构性质")?.value || "", /非五所Poly、非自治大学/);
  assert.match(item.sections.flatMap((section) => section.items).join(" "), /调查年份、样本人数/);
});

test("preschool directory includes five AOP operators and an international-family decision guide", () => {
  const operators = schoolGuideOfficialInstitutions.filter((item) => item.subcategory === "Anchor Operator");
  assert.equal(operators.length, 5);
  for (const item of operators) {
    assert.equal(getSchoolGuideInstitutionDirectoryGroup(item), "anchor-operators");
    assert.ok(item.sections.some((section) => section.title === "中国家庭申请步骤"));
  }
  const guide = schoolGuideOfficialInstitutions.find((item) => item.slug === "guide-preschool-china-family");
  assert.ok(guide);
  assert.equal(getSchoolGuideInstitutionDirectoryGroup(guide), "preschool-decision");
  assert.ok(guide.sections.length >= 5);
});
