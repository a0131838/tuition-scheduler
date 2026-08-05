import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(path.join(process.cwd(), "app/contract/[token]/page.tsx"), "utf8");

test("Full Care sign-page summary uses the contract price tier instead of the package course", () => {
  assert.match(source, /Tuition price tier \/ 课时价格档/);
  assert.match(source, /snapshot\.care\?\.included \? snapshot\.package\.courseName : contract\.courseName/);
});

test("Full Care electronic acceptance names the standalone agreement", () => {
  assert.match(source, /I have read and understood the Full Care Service Agreement/);
  assert.doesNotMatch(source, /tuition agreement and Full Care Service Addendum/);
});
