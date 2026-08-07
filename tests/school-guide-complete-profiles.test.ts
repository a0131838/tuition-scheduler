import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getSchoolGuideInstitutionDirectoryGroup, schoolGuideOfficialInstitutions } from "../lib/school-guide-official-institutions";
import { schoolGuideDirectoryCategories } from "../lib/school-guide-directory";
import { schoolGuideSchools } from "../lib/school-guide-data";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("every catalogued school or campus has a bilingual maintained profile", () => {
  assert.equal(schoolGuideSchools.length, 84);
  assert.equal(new Set(schoolGuideSchools.map((school) => school.slug)).size, 84);
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
  const popularHigherEducation = schoolGuideOfficialInstitutions.filter((item) =>
    item.categoryId === "private-specialist" && item.badges.includes("热门私立高校"),
  );
  assert.equal(popularHigherEducation.length, 10);
  assert.equal(new Set(popularHigherEducation.map((item) => item.slug)).size, 10);
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
  assert.ok(namesOnly.sections.flatMap((section) => section.items).length >= 3);
  const furen = schoolGuideOfficialInstitutions.find((item) => item.slug === "private-furen-international-school");
  assert.ok(furen);
  assert.equal(furen.nameZh, "辅仁国际学校");
  assert.ok(furen.sections.some((section) => section.items.join(" ").includes("入学测试")));
  for (const slug of [
    "private-dimensions",
    "private-insworld",
    "private-stalford-academy",
    "private-five-steps-academy",
    "private-guild-international-college",
    "private-sish-institute",
  ]) {
    const institution = schoolGuideOfficialInstitutions.find((item) => item.slug === slug);
    assert.ok(institution, `${slug} is missing from private/specialist`);
    assert.equal(institution.categoryId, "private-specialist");
  }
  for (const slug of ["private-amity-singapore", "private-kingston-international-college"]) {
    const institution = schoolGuideOfficialInstitutions.find((item) => item.slug === slug);
    assert.ok(institution, `${slug} is missing`);
    for (const title of ["2026学费与开学时间", "申请与入学标准"]) {
      assert.ok(institution.sections.some((section) => section.title === title), `${slug} is missing ${title}`);
    }
    assert.ok(institution.partnerProgrammes?.length, `${slug} is missing structured university programmes`);
  }
});

test("every popular private higher education profile maps awarding partners to detailed programmes and current QS context", () => {
  const popularHigherEducation = schoolGuideOfficialInstitutions.filter((item) => item.badges.includes("热门私立高校"));
  let partnerCount = 0;
  let programmeCount = 0;
  for (const institution of popularHigherEducation) {
    assert.ok(institution.partnerProgrammes?.length, `${institution.name} is missing partner programme records`);
    for (const partner of institution.partnerProgrammes ?? []) {
      partnerCount += 1;
      assert.ok(partner.partner.trim(), `${institution.name} has an unnamed awarding partner`);
      assert.ok(partner.relationship.trim(), `${partner.partner} is missing its awarding relationship`);
      assert.match(partner.qsRanking, /QS世界大学排名2027/);
      assert.ok(partner.programmeGroups.length, `${partner.partner} is missing programme groups`);
      for (const programmeGroup of partner.programmeGroups) {
        assert.ok(programmeGroup.level.trim());
        assert.ok(programmeGroup.programmes.length, `${partner.partner} ${programmeGroup.level} is empty`);
        assert.ok(
          programmeGroup.programmes.every((programme) => programme.nameZh.trim()
            && programme.nameEn.trim()
            && /[\u3400-\u9fff]/.test(programme.nameZh)
            && !/相关专业|相关课程|MBA\s*\/\s*MSc|以当前.*为准|按当前.*为准/.test(programme.nameEn)),
          `${partner.partner} contains a vague programme placeholder`,
        );
        programmeCount += programmeGroup.programmes.length;
      }
    }
  }
  assert.ok(partnerCount >= 35, `expected at least 35 awarding-partner records, got ${partnerCount}`);
  assert.ok(programmeCount >= 120, `expected at least 120 detailed programme lines, got ${programmeCount}`);

  const webDetail = read("app/school-guide/institutions/[slug]/page.tsx");
  const miniDetail = read("miniapp/boss-academic-parent/pages/guide-institution-detail/guide-institution-detail.wxml");
  assert.match(webDetail, /合作大学、具体专业与QS排名/);
  assert.match(miniDetail, /合作大学与专业/);
  assert.match(miniDetail, /partner\.qsRanking/);
  assert.match(miniDetail, /partner\.programmeGroups/);
});

test("private higher education and public postsecondary routes stay separated and easy to filter", () => {
  const privateCategory = schoolGuideDirectoryCategories.find((item) => item.id === "private-specialist");
  const publicCategory = schoolGuideDirectoryCategories.find((item) => item.id === "postsecondary");
  assert.ok(privateCategory?.sectorIds.includes("private-education-institutions"));
  assert.ok(!publicCategory?.sectorIds.includes("private-education-institutions"));
  assert.deepEqual(publicCategory?.groups?.map((item) => item.id), ["ALL", "jc-mi", "polytechnics", "bca-academy", "research-universities", "applied-universities", "ite", "arts"]);
  assert.deepEqual(privateCategory?.groups?.map((item) => item.id), ["ALL", "private-secondary", "private-higher", "private-higher-other", "faith-special", "private-overview"]);

  const popularPrivate = schoolGuideOfficialInstitutions.filter((item) => item.badges.includes("热门私立高校"));
  assert.equal(popularPrivate.length, 10);
  assert.ok(popularPrivate.every((item) => item.categoryId === "private-specialist"));
  assert.ok(popularPrivate.every((item) => getSchoolGuideInstitutionDirectoryGroup(item) === "private-higher"));
  assert.equal(schoolGuideOfficialInstitutions.filter((item) => getSchoolGuideInstitutionDirectoryGroup(item) === "private-higher").length, 10);
  assert.ok(schoolGuideOfficialInstitutions.some((item) => getSchoolGuideInstitutionDirectoryGroup(item) === "private-higher-other"));
  assert.equal(schoolGuideOfficialInstitutions.filter((item) => item.categoryId === "postsecondary" && item.badges.includes("热门私立高校")).length, 0);

  for (const slug of ["private-san-yu-adventist", "private-st-francis-methodist"]) {
    const institution = schoolGuideOfficialInstitutions.find((item) => item.slug === slug);
    assert.ok(institution?.badges.includes("教会学校"));
    assert.equal(institution && getSchoolGuideInstitutionDirectoryGroup(institution), "faith-special");
  }

  for (const group of ["jc-mi", "polytechnics", "bca-academy", "research-universities", "applied-universities", "ite", "arts"]) {
    assert.ok(schoolGuideOfficialInstitutions.some((item) => item.categoryId === "postsecondary" && getSchoolGuideInstitutionDirectoryGroup(item) === group), `${group} has no public profile`);
  }
});

test("consumer school pages keep research inside the product", () => {
  const miniDetail = read("miniapp/boss-academic-parent/pages/guide-school-detail/guide-school-detail.wxml");
  const webDetail = read("app/school-guide/schools/[slug]/page.tsx");
  const webDetailTabs = read("app/school-guide/schools/[slug]/SchoolDetailTabs.tsx");
  assert.doesNotMatch(miniDetail, /复制学校官网|复制官方链接|官方来源/);
  assert.doesNotMatch(webDetail, /学校官网|IB官方详情|官方来源/);
  assert.match(webDetailTabs, /概览/);
  assert.match(webDetailTabs, /成绩升学/);
  assert.match(webDetailTabs, /申请费用/);
  assert.match(webDetailTabs, /useState<Tab>\("results"\)/);
  assert.ok(webDetailTabs.indexOf('["results", "成绩升学"]') < webDetailTabs.indexOf('["overview", "概览"]'));
  assert.match(miniDetail, /历年学术成绩/);
  assert.match(miniDetail, /大学录取与去向/);
  assert.match(miniDetail, /下次复核/);
  const miniDetailJs = read("miniapp/boss-academic-parent/pages/guide-school-detail/guide-school-detail.js");
  assert.match(miniDetailJs, /activeDetailTab: "RESULTS"/);
  assert.ok(miniDetail.indexOf("data-tab=\"RESULTS\"") < miniDetail.indexOf("data-tab=\"OVERVIEW\""));
});

test("international-school browsing prioritises selected IB schools and keeps filters unclipped", () => {
  const international = schoolGuideDirectoryCategories.find((item) => item.id === "international");
  assert.ok(international);
  const explorer = read("app/school-guide/schools/SchoolExplorer.tsx");
  const miniList = read("miniapp/boss-academic-parent/pages/guide-schools/guide-schools.wxml");
  const miniSharedCss = read("miniapp/boss-academic-parent/styles/school-guide.wxss");
  assert.match(explorer, /第一梯队优先 · 综合排序/);
  assert.match(explorer, /is-scrollable/);
  assert.doesNotMatch(explorer, /更多筛选/);
  assert.match(miniList, /scroll-view class="school-focus-scroll"/);
  assert.doesNotMatch(miniList, /更多筛选/);
  assert.match(miniList, /国家\/侨民课程/);
  assert.match(miniList, /第一梯队/);
  assert.doesNotMatch(miniSharedCss, /grid-template-columns:\s*1fr 180rpx/);
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
