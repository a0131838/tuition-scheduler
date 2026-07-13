import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync("app/admin/care/[id]/page.tsx", "utf8");

test("care server actions use a module-level redirect helper", () => {
  const helperIndex = source.indexOf("async function runCareAction");
  const componentIndex = source.indexOf("export default async function CareDetailPage");

  assert.ok(helperIndex >= 0, "runCareAction helper must exist");
  assert.ok(componentIndex >= 0, "CareDetailPage component must exist");
  assert.ok(helperIndex < componentIndex, "runCareAction must stay outside the page component");
  assert.doesNotMatch(source, /runCareAction\([^\n]+,\s*\(\)\s*=>/);
});
