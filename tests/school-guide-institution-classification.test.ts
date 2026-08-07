import assert from "node:assert/strict";
import test from "node:test";
import moeData from "../data/school-guide/moe-schools-2026.json";
import {
  getSchoolGuideInstitutionDirectoryGroup,
  schoolGuideMoeInstitutions,
  schoolGuideOfficialInstitutions,
} from "../lib/school-guide-official-institutions";

const jaeJcMiNames = new Set([
  "Anderson Serangoon Junior College", "Anglo-Chinese Junior College", "Anglo-Chinese School (Independent)",
  "Catholic Junior College", "Dunman High School", "Eunoia Junior College", "Hwa Chong Institution",
  "Jurong Pioneer Junior College", "Millennia Institute", "Nanyang Junior College", "National Junior College",
  "Raffles Institution", "River Valley High School", "St Andrew's Junior College", "St. Joseph's Institution",
  "Tampines Meridian Junior College", "Temasek Junior College", "Victoria Junior College", "Yishun Innova Junior College",
]);

test("all 337 MOE directory records remain represented exactly once", () => {
  assert.equal(moeData.records.length, 337);
  assert.equal(schoolGuideMoeInstitutions.length, 337);
  assert.equal(new Set(schoolGuideMoeInstitutions.map((item) => item.slug)).size, 337);
});

test("2026 JAE JC and MI list contains all 19 institutions including mixed-level schools", () => {
  const jcMi = schoolGuideMoeInstitutions.filter((item) => item.categoryId === "postsecondary" && getSchoolGuideInstitutionDirectoryGroup(item) === "jc-mi");
  assert.equal(jcMi.length, 19);
  assert.deepEqual(new Set(jcMi.map((item) => item.name)), jaeJcMiNames);
  for (const name of ["Anglo-Chinese School (Independent)", "Hwa Chong Institution", "Raffles Institution", "St. Joseph's Institution"]) {
    const item = jcMi.find((institution) => institution.name === name);
    assert.ok(item, `${name} is missing from JC/MI`);
    assert.deepEqual(item.pathwaySlugs, ["jae-jc-mi"]);
  }
});

test("specialised through-train schools do not masquerade as ordinary JC admissions", () => {
  for (const name of ["Nus High School Of Mathematics And Science", "School Of The Arts, Singapore", "Singapore Sports School"]) {
    const item = schoolGuideMoeInstitutions.find((institution) => institution.name === name);
    assert.ok(item, `${name} is missing`);
    assert.equal(item.categoryId, "government");
    assert.equal(getSchoolGuideInstitutionDirectoryGroup(item), "government-specialised");
  }
});

test("regulatory overview cards are separated from real private schools", () => {
  for (const slug of ["guide-private-schools", "guide-madrasahs", "guide-pei"]) {
    const item = schoolGuideOfficialInstitutions.find((institution) => institution.slug === slug);
    assert.ok(item);
    assert.equal(getSchoolGuideInstitutionDirectoryGroup(item), "private-overview");
  }
});

test("no removed multi-school aggregate remains in the public directory", () => {
  for (const slug of ["guide-polytechnics", "guide-autonomous-universities", "guide-arts-institutions"]) {
    assert.equal(schoolGuideOfficialInstitutions.some((item) => item.slug === slug), false, `${slug} still exists`);
  }
});
