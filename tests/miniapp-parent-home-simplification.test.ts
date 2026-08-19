import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.join(process.cwd(), "miniapp", "boss-academic-parent", "pages", "home");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("parent home keeps one action, an optional next lesson and three compact routes", () => {
  const page = read("home.wxml");
  const style = read("home.wxss");

  assert.match(page, /wx:if="\{\{primaryAction\}\}"/);
  assert.match(page, /wx:if="\{\{nextSession\}\}"/);
  assert.match(page, /现在需要您确认/);
  assert.match(page, /课表/);
  assert.match(page, /服务进展/);
  assert.match(page, /联系团队/);
  assert.doesNotMatch(page, /目前没有已确认的近期课程/);
  assert.doesNotMatch(page, /\{\{latestUpdate\.summary\}\}/);
  assert.doesNotMatch(page, /overviewExpanded/);
  assert.equal((page.match(/class="quick-action"/g) || []).length, 4);
  assert.match(style, /-webkit-line-clamp:\s*2/);
});
