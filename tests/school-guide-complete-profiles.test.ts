import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { schoolGuideOfficialInstitutions } from "../lib/school-guide-official-institutions";
import { schoolGuideSchools } from "../lib/school-guide-data";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("every catalogued school or campus has a bilingual maintained profile", () => {
  assert.equal(schoolGuideSchools.length, 43);
  assert.equal(new Set(schoolGuideSchools.map((school) => school.slug)).size, 43);
  for (const school of schoolGuideSchools) {
    assert.ok(school.nameZh.trim(), `${school.name} is missing a Chinese name`);
    assert.ok(school.name.trim(), `${school.slug} is missing an English name`);
    assert.match(school.publicUpdatedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(school.nextPublicReviewAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(school.updateCadence.includes("更新") || school.updateCadence.includes("复核"));
    assert.ok(school.verifiedFacts.length > 0);
  }
});

test("published result histories are structured, chronological and source-safe", () => {
  const schools = schoolGuideSchools.filter((school) => school.academicResults?.records.length);
  assert.ok(schools.length >= 25);
  for (const school of schools) {
    assert.ok(school.academicResults?.programme);
    assert.ok(school.academicResults?.note);
    for (const record of school.academicResults?.records ?? []) {
      assert.match(record.year, /^\d{4}$/);
      assert.ok(record.average || record.passRate || record.highlight);
    }
  }
});

test("every international school explains the current academic-result status", () => {
  for (const school of schoolGuideSchools) {
    assert.ok(school.academicResults?.programme, `${school.name} is missing an academic programme label`);
    assert.ok(school.academicResults?.note, `${school.name} is missing an academic result status`);
    assert.ok(
      school.universityOutcomeNote || school.universityOutcomes?.length,
      `${school.name} is missing a university outcome status`,
    );
  }
});

test("popular private higher education and secondary routes have detailed profiles", () => {
  const detailed = schoolGuideOfficialInstitutions.filter((item) =>
    item.badges.some((badge) => ["重点热门", "重点高中路线", "常见选择"].includes(badge)),
  );
  assert.ok(detailed.length >= 11);
  for (const item of detailed) {
    assert.ok(item.sections.length >= 3, `${item.name} needs structured detail`);
    assert.ok(item.sections.some((section) => section.title.includes("申请")), `${item.name} needs admissions detail`);
    assert.ok(item.sourceAuthority, `${item.name} needs source provenance`);
    assert.ok(item.sourceNote, `${item.name} needs a source note`);
  }
  const namesOnly = schoolGuideOfficialInstitutions.find((item) => item.slug === "private-other-peis");
  assert.ok(namesOnly);
  assert.ok(namesOnly.sections.flatMap((section) => section.items).length >= 5);
});

test("consumer school pages keep research inside the product", () => {
  const miniDetail = read("miniapp/boss-academic-parent/pages/guide-school-detail/guide-school-detail.wxml");
  const webDetail = read("app/school-guide/schools/[slug]/page.tsx");
  assert.doesNotMatch(miniDetail, /复制学校官网|复制官方链接|官方来源/);
  assert.doesNotMatch(webDetail, /学校官网|IB官方详情|官方来源/);
  assert.match(miniDetail, /历年学术成绩/);
  assert.match(miniDetail, /大学录取与去向/);
  assert.match(miniDetail, /下次复核/);
});

test("public guide forms collect WeChat rather than phone numbers", () => {
  const files = [
    "miniapp/boss-academic-parent/pages/guide-consult/guide-consult.wxml",
    "miniapp/boss-academic-parent/pages/guide-academic-assessment/guide-academic-assessment.wxml",
    "miniapp/boss-academic-parent/pages/guide-privacy/guide-privacy.wxml",
    "app/school-guide/consult/ConsultForm.tsx",
    "app/school-guide/privacy/page.tsx",
  ];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /联系电话|微信或电话|电话：/, `${file} still exposes phone collection`);
  }
});
