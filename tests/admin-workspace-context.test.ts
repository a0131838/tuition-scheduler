import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  workspaceHintForPath,
  workspaceTitleForPath,
} from "../app/admin/_components/adminWorkspaceContext";

test("full-care title is limited to the full-care route", () => {
  assert.equal(workspaceTitleForPath("/admin/care", "BILINGUAL"), "Full Care / 全托管");
  assert.equal(workspaceTitleForPath("/admin/care/project-1", "ZH"), "全托管");
  assert.equal(workspaceTitleForPath("/admin/student-sources", "BILINGUAL"), "Admin Workspace / 管理工作台");
});

test("workspace hint follows the current route", () => {
  const careHint = workspaceHintForPath("/admin/care", "EN", false, false);
  const sourcesHint = workspaceHintForPath("/admin/student-sources", "EN", false, false);

  assert.match(careHint, /service scope/);
  assert.doesNotMatch(sourcesHint, /service scope/);
});

test("admin shared layout delegates route-sensitive context to a client component", () => {
  const layoutSource = readFileSync("app/admin/layout.tsx", "utf8");
  const clientSource = readFileSync("app/admin/_components/AdminWorkspaceContextClient.tsx", "utf8");

  assert.match(layoutSource, /AdminWorkspaceContextClient/);
  assert.doesNotMatch(layoutSource, /workspaceTitle\(pathname/);
  assert.doesNotMatch(layoutSource, /workspaceHint\(pathname/);
  assert.match(clientSource, /usePathname\(\)/);
  assert.match(clientSource, /usePathname\(\) \|\| initialPathname/);
});
