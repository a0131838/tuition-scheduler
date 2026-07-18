import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("miniapp mutation and upload helpers emit a non-blocking operation log", () => {
  const source = readFileSync("miniapp/boss-academic-parent/utils/api.js", "utf8");
  assert.match(source, /function logOperation/);
  assert.match(source, /method === "GET"/);
  assert.match(source, /logOperation\(path, method/);
  assert.match(source, /logOperation\(path, "UPLOAD"/);
  assert.match(source, /\[redacted\]/);
});

test("operation log endpoint authenticates and writes searchable audit rows", () => {
  const source = readFileSync("app/api/miniapp/operation-log/route.ts", "utf8");
  assert.match(source, /getStaffMiniappSession/);
  assert.match(source, /getParentPortalSession/);
  assert.match(source, /module: "MINIAPP"/);
  assert.match(source, /logAudit/);
  assert.match(source, /REDACTED_KEYS/);
});
