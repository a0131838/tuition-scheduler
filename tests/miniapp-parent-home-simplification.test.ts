import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.join(process.cwd(), "miniapp", "boss-academic-parent", "pages", "home");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("parent home keeps one action, real updates and four useful service routes", () => {
  const page = read("home.wxml");
  const style = read("home.wxss");

  assert.match(page, /wx:if="\{\{primaryAction\}\}"/);
  assert.match(page, /wx:if="\{\{nextSession\}\}"/);
  assert.match(page, /现在需要您确认/);
  assert.match(page, /最新进展/);
  assert.match(page, /新加坡学校/);
  assert.match(page, /入学测评/);
  assert.match(page, /提交需求/);
  assert.match(page, /联系顾问/);
  assert.doesNotMatch(page, /目前没有已确认的近期课程/);
  assert.match(page, /\{\{latestUpdate\.summary\}\}/);
  assert.doesNotMatch(page, /overviewExpanded/);
  assert.equal((page.match(/class="service-entry"/g) || []).length, 5);
  assert.doesNotMatch(page, /class="quick-action"/);
  assert.match(style, /-webkit-line-clamp:\s*2/);
});
