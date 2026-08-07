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
  assert.equal(schoolGuideSchools.length, 84);
  assert.equal(schoolGuideSchoolGroups.length, 56);
  assert.equal(new Set(schoolGuideSchoolGroups.map((item) => item.slug)).size, 56);
  assert.equal(schoolGuideSchoolGroups.filter((item) => item.nameZh === "全球印度国际学校").length, 1);
  assert.equal(schoolGuideSchoolGroups.filter((item) => item.nameZh === "壹世界国际学校").length, 1);
});

test("international directory excludes government, preschool, faith-school and PEI exam-route records", () => {
  const names = new Set(schoolGuideSchoolGroups.map((item) => item.name));
  assert.equal(names.has("Anglo-Chinese School (Independent)"), false);
  assert.equal(names.has("School of the Arts, Singapore"), false);
  assert.equal(names.has("Singapore Sports School"), false);
  assert.equal(names.has("St Francis Methodist School"), false);
  assert.equal(names.has("Odyssey The Global Preschool"), false);
  for (const privateRoute of [
    "Dimensions International College (School Division)",
    "Insworld Institute",
    "Stalford Academy",
    "5 Steps Academy",
    "SISH International High School",
    "The GUILD International College",
    "TLS Academy",
    "The Straits Waldorf School",
    "Lodestar Montessori School",
    "All Hands Together",
  ]) assert.equal(names.has(privateRoute), false, `${privateRoute} should be in private/specialist`);
  assert.equal(names.has("Olympiad International School"), true);
  assert.equal(names.has("HWA International School"), true);
  assert.ok(getSchoolGuideSchoolGroup("anglo-chinese-school-independent-2"));
});

test("international directory includes recent and visa-limited schools", () => {
  const brighton = schoolGuideSchoolGroups.find((item) => item.name === "Brighton College (Singapore)");
  const grange = schoolGuideSchoolGroups.find((item) => item.name === "The Grange Institution");
  const astor = schoolGuideSchoolGroups.find((item) => item.name === "Astor International School");
  const perse = schoolGuideSchoolGroups.find((item) => item.name === "The Perse School (Singapore)");
  assert.equal(brighton?.studentPass?.status, "SUPPORTED");
  assert.equal(grange?.studentPass?.status, "LONG_TERM_PASS_ONLY");
  assert.equal(astor?.studentPass?.status, "LONG_TERM_PASS_ONLY");
  assert.equal(perse?.studentPass?.status, "VERIFY_WITH_SCHOOL");
  assert.ok(brighton?.directoryTags.includes("NEW"));
  assert.ok(grange?.directoryTags.includes("VISA_LIMITED"));
  assert.ok(schoolGuideSchoolGroups.every((item) => item.studentPass?.label && item.studentPass.note));
});

test("main curriculum filters are mutually exclusive and IB takes precedence for multi-curriculum schools", () => {
  const tanglin = schoolGuideSchoolGroups.find((item) => item.name === "Tanglin Trust School");
  const sas = schoolGuideSchoolGroups.find((item) => item.name === "Singapore American School");
  const brighton = schoolGuideSchoolGroups.find((item) => item.name === "Brighton College (Singapore)");
  assert.equal(tanglin?.primaryCurriculum, "IB");
  assert.ok(tanglin?.directoryTags.includes("BRITISH"));
  assert.equal(sas?.primaryCurriculum, "AMERICAN");
  assert.equal(brighton?.primaryCurriculum, "BRITISH");
  assert.ok(schoolGuideSchoolGroups.every((item) =>
    ["IB", "BRITISH", "AMERICAN", "OTHER"].includes(item.primaryCurriculum),
  ));
  assert.ok(schoolGuideSchoolGroups
    .filter((item) => item.primaryCurriculum === "BRITISH")
    .every((item) => !item.directoryTags.includes("IB")));
  assert.ok(schoolGuideSchoolGroups
    .filter((item) => item.primaryCurriculum === "AMERICAN")
    .every((item) => !item.directoryTags.includes("IB") && !item.directoryTags.includes("BRITISH")));
});

test("campus brands resolve every legacy slug into one parent profile", () => {
  const eton = schoolGuideSchoolGroups.find((item) => item.nameZh === "伊顿国际学校与幼儿园");
  const odyssey = getSchoolGuideSchoolGroup("odyssey-the-global-preschool-pte-ltd-26");
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
  assert.match(miniapp, /选择学校类型/);
  assert.match(miniappJs, /directoryCategories/);
});

test("consumer directory marks only the five agreed first-tier schools", () => {
  const firstTier = schoolGuideSchoolGroups.filter((item) => item.isFirstTier).map((item) => item.name).sort();
  assert.deepEqual(firstTier, [
    "Dulwich College (Singapore)",
    "North London Collegiate School (Singapore)",
    "Singapore American School",
    "Tanglin Trust School",
    "UWC South East Asia (UWCSEA)",
  ].sort());
  assert.match(fs.readFileSync("app/school-guide/schools/SchoolExplorer.tsx", "utf8"), /第一梯队/);
  assert.match(fs.readFileSync("miniapp\/boss-academic-parent\/pages\/guide-schools\/guide-schools.wxml", "utf8"), /第一梯队/);
});

test("consumer directory uses one explicit priority order in every curriculum view", () => {
  assert.deepEqual(schoolGuideSchoolGroups.slice(0, 5).map((item) => item.name), [
    "Tanglin Trust School",
    "UWC South East Asia (UWCSEA)",
    "Singapore American School",
    "Dulwich College (Singapore)",
    "North London Collegiate School (Singapore)",
  ]);
  assert.equal(new Set(schoolGuideSchoolGroups.map((item) => item.browseRank)).size, schoolGuideSchoolGroups.length);
  assert.deepEqual(
    schoolGuideSchoolGroups.filter((item) => item.primaryCurriculum === "IB").slice(0, 4).map((item) => item.name),
    ["Tanglin Trust School", "UWC South East Asia (UWCSEA)", "Dulwich College (Singapore)", "North London Collegiate School (Singapore)"],
  );
  assert.equal(schoolGuideSchoolGroups.find((item) => item.primaryCurriculum === "BRITISH")?.name, "Brighton College (Singapore)");
  assert.equal(schoolGuideSchoolGroups.find((item) => item.primaryCurriculum === "AMERICAN")?.name, "Singapore American School");
  assert.equal(schoolGuideSchoolGroups.find((item) => item.primaryCurriculum === "OTHER")?.name, "International French School (Singapore)");
});

test("miniapp preserves rank zero and shows every filter in one horizontal rail", () => {
  const miniappJs = fs.readFileSync("miniapp/boss-academic-parent/pages/guide-schools/guide-schools.js", "utf8");
  const miniappWxml = fs.readFileSync("miniapp/boss-academic-parent/pages/guide-schools/guide-schools.wxml", "utf8");
  const web = fs.readFileSync("app/school-guide/schools/SchoolExplorer.tsx", "utf8");
  assert.doesNotMatch(miniappJs, /browseRank\s*\|\|\s*999/);
  assert.match(miniappJs, /Number\.isFinite\(Number\(a\.browseRank\)\)/);
  assert.doesNotMatch([miniappJs, miniappWxml, web].join("\n"), /showMoreFilters|toggleMoreFilters|更多筛选/);
  for (const label of ["全部", "IB", "英式 / Cambridge", "美式 / AP", "其他课程", "国家\/侨民课程", "近期开校", "需长期准证", "专项支持", "学前"]) {
    assert.match(miniappWxml, new RegExp(label));
  }
});

test("consumer surfaces hide generic Student Pass fallback and keep only real restrictions", () => {
  const sources = [
    fs.readFileSync("app/school-guide/schools/SchoolExplorer.tsx", "utf8"),
    fs.readFileSync("app/school-guide/schools/[slug]/page.tsx", "utf8"),
    fs.readFileSync("app/school-guide/schools/[slug]/SchoolDetailTabs.tsx", "utf8"),
    fs.readFileSync("miniapp/boss-academic-parent/pages/guide-schools/guide-schools.wxml", "utf8"),
    fs.readFileSync("miniapp/boss-academic-parent/pages/guide-school-detail/guide-school-detail.js", "utf8"),
    fs.readFileSync("miniapp/boss-academic-parent/pages/guide-school-detail/guide-school-detail.wxml", "utf8"),
  ];
  for (const source of sources) assert.doesNotMatch(source, /Student’s Pass资格需书面确认|需向学校书面确认/);
  assert.match(sources.join("\n"), /LONG_TERM_PASS_ONLY/);
  assert.match(sources.join("\n"), /申请判断/);
});
