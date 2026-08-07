import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { schoolGuideSchoolGroups } from "../lib/school-guide-directory";
import { schoolGuideOfficialInstitutions } from "../lib/school-guide-official-institutions";
import { schoolGuideDetailedPathways, schoolGuideSamplePacks } from "../lib/school-guide-pathways";

const root = process.cwd();
const miniapp = path.join(root, "miniapp/boss-academic-parent");
const read = (relative: string) => fs.readFileSync(path.join(miniapp, relative), "utf8");

test("every international directory brand has a substantive detail profile", () => {
  assert.equal(schoolGuideSchoolGroups.length, 56);
  for (const school of schoolGuideSchoolGroups) {
    assert.ok((school.detailSections?.length || 0) >= 3, `${school.name} has fewer than 3 detail sections`);
    assert.ok(school.comparison?.curriculum, `${school.name} has no curriculum summary`);
    assert.ok(school.officialWebsiteUrl, `${school.name} has no official website reference`);
  }
});

test("official institution directory exposes detailed profiles in every category", () => {
  for (const category of ["government", "preschool", "private-specialist", "postsecondary", "special-support"]) {
    const items = schoolGuideOfficialInstitutions.filter((item) => item.categoryId === category);
    assert.ok(items.length > 0, `${category} is empty`);
    for (const item of items) {
      assert.ok(item.keyFacts.length >= 4, `${item.slug} has insufficient key facts`);
      assert.ok(item.sections.length >= 2, `${item.slug} has insufficient sections`);
      assert.ok(item.pathwaySlugs.length > 0, `${item.slug} has no pathway`);
    }
  }
});

test("all pathway downloads resolve to generated PDFs", () => {
  const packSlugs = new Set(schoolGuideSamplePacks.map((item) => item.slug));
  assert.deepEqual([...packSlugs].sort(), ["aeis-primary-sample", "aeis-secondary-sample", "international-primary-sample", "international-secondary-sample"]);
  for (const pathway of schoolGuideDetailedPathways) {
    assert.ok(pathway.steps.length > 0, `${pathway.slug} has no steps`);
    assert.ok(pathway.examSections.length > 0, `${pathway.slug} has no assessment details`);
    for (const slug of pathway.samplePackSlugs) assert.ok(packSlugs.has(slug), `${pathway.slug} references missing ${slug}`);
  }
  for (const pack of schoolGuideSamplePacks) {
    assert.match(pack.title, /英文/);
    assert.doesNotMatch(pack.title, /数学|Math/i);
    const file = path.join(root, "public", pack.downloadUrl.replace(/^\//, ""));
    assert.ok(fs.existsSync(file), `${pack.slug} PDF does not exist`);
    assert.ok(fs.statSync(file).size > 5_000, `${pack.slug} PDF is unexpectedly small`);
  }
});

test("public launch and shares do not point to login", () => {
  const app = JSON.parse(read("app.json"));
  assert.equal(app.pages[0], "pages/guide-home/guide-home");
  assert.match(read("pages/guide-home/guide-home.js"), /entry === "assessment"/);
  assert.match(read("pages/login/login.js"), /path: "\/pages\/guide-home\/guide-home"/);
  assert.match(read("pages/staff-login/staff-login.js"), /path: "\/pages\/guide-home\/guide-home"/);
});
