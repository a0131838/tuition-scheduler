import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
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
  assert.ok(schools.length >= 5);
  for (const school of schools) {
    assert.ok(school.academicResults?.programme);
    assert.ok(school.academicResults?.note);
    for (const record of school.academicResults?.records ?? []) {
      assert.match(record.year, /^\d{4}$/);
      assert.ok(record.average || record.passRate || record.highlight);
    }
  }
});

test("consumer school pages keep research inside the product", () => {
  const miniDetail = read("miniapp/boss-academic-parent/pages/guide-school-detail/guide-school-detail.wxml");
  const webDetail = read("app/school-guide/schools/[slug]/page.tsx");
  assert.doesNotMatch(miniDetail, /复制学校官网|复制官方链接|官方来源/);
  assert.doesNotMatch(webDetail, /学校官网|IB官方详情|官方来源/);
  assert.match(miniDetail, /历年学术成绩/);
  assert.match(miniDetail, /大学录取与去向/);
  assert.match(miniDetail, /下次计划复核/);
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
