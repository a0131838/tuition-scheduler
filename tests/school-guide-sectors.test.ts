import assert from "node:assert/strict";
import test from "node:test";
import { schoolGuideSectors } from "../lib/school-guide-data";

test("school guide covers the full education journey", () => {
  const stages = new Set(schoolGuideSectors.map((item) => item.stage));
  assert.deepEqual(
    [...stages],
    ["学前", "小学", "中学", "高中与专上", "特殊与其他"],
  );
  assert.ok(schoolGuideSectors.length >= 13);
});

test("every education sector has an official or internal destination", () => {
  for (const sector of schoolGuideSectors) {
    assert.ok(sector.officialUrl || sector.internalHref, `${sector.id} has no destination`);
    if (sector.officialUrl) assert.match(sector.officialUrl, /^https:\/\//);
    assert.ok(sector.authority);
    assert.ok(sector.includes.length);
  }
});

test("comprehensive directory includes key non-international sectors", () => {
  const ids = new Set(schoolGuideSectors.map((item) => item.id));
  for (const id of [
    "moe-kindergarten",
    "licensed-preschools",
    "primary-schools",
    "secondary-schools",
    "independent-specialised",
    "jc-mi",
    "sped-schools",
    "private-schools",
    "private-education-institutions",
    "madrasahs",
    "ite-poly-arts",
    "autonomous-universities",
  ]) {
    assert.ok(ids.has(id), `missing sector ${id}`);
  }
});
