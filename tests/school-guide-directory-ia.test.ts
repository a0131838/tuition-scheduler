import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  getSchoolGuideDirectoryCategories,
  getSchoolGuideSchoolGroup,
  schoolGuideSchoolGroups,
} from "../lib/school-guide-directory";
import { schoolGuideSchools, schoolGuideSectors } from "../lib/school-guide-data";

test("consumer directory keeps raw evidence but shows unique school brands", () => {
  assert.equal(schoolGuideSchools.length, 43);
  assert.equal(schoolGuideSchoolGroups.length, 34);
  assert.equal(new Set(schoolGuideSchoolGroups.map((item) => item.slug)).size, 34);
  assert.equal(schoolGuideSchoolGroups.filter((item) => item.nameZh === "全球印度国际学校").length, 1);
  assert.equal(schoolGuideSchoolGroups.filter((item) => item.nameZh === "壹世界国际学校").length, 1);
});

test("campus brands resolve every legacy slug into one parent profile", () => {
  const eton = schoolGuideSchoolGroups.find((item) => item.nameZh === "伊顿国际学校与幼儿园");
  const odyssey = schoolGuideSchoolGroups.find((item) => item.nameZh === "奥德赛全球幼儿园");
  const uwc = schoolGuideSchoolGroups.find((item) => item.nameZh === "东南亚世界联合书院");
  assert.equal(eton?.memberSlugs.length, 4);
  assert.equal(eton?.campusProfiles.length, 4);
  assert.equal(odyssey?.memberSlugs.length, 4);
  assert.equal(uwc?.memberSlugs.length, 2);
  for (const group of [eton, odyssey, uwc]) {
    assert.ok(group);
    for (const slug of group.memberSlugs) assert.equal(getSchoolGuideSchoolGroup(slug)?.slug, group.slug);
  }
});

test("six peer categories contain concise internal subcategories", () => {
  const categories = getSchoolGuideDirectoryCategories(schoolGuideSectors);
  assert.deepEqual(categories.map((item) => item.id), [
    "international",
    "government",
    "preschool",
    "private-specialist",
    "postsecondary",
    "special-support",
  ]);
  assert.equal(categories.length, 6);
  assert.ok(categories.every((item) => item.sections.length > 0));
  assert.ok(categories.every((item) => item.sections.every((section) => !("officialUrl" in section))));
});

test("school directory no longer asks parents to copy external links", () => {
  const miniapp = fs.readFileSync("miniapp/boss-academic-parent/pages/guide-schools/guide-schools.wxml", "utf8");
  const miniappJs = fs.readFileSync("miniapp/boss-academic-parent/pages/guide-schools/guide-schools.js", "utf8");
  const web = fs.readFileSync("app/school-guide/schools/page.tsx", "utf8");
  for (const source of [miniapp, miniappJs, web]) {
    assert.doesNotMatch(source, /复制官方链接|setClipboardData|target="_blank"|officialUrl/);
  }
  assert.match(miniapp, /你想找哪类学校/);
  assert.match(miniappJs, /directoryCategories/);
});
