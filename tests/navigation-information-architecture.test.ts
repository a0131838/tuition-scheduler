import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { isOperationsAdminPathAllowed } from "../lib/operations-admin-access";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("admin navigation uses six task-oriented groups without changing route permissions", () => {
  const layout = read("app/admin/layout.tsx");
  for (const title of [
    't(lang, "Today", "今日工作")',
    't(lang, "Teaching Operations", "教学运营")',
    't(lang, "Parent & Student Service", "家长与学生服务")',
    't(lang, "People & Training", "人员与培训")',
    't(lang, "Finance & Review", "财务与审核")',
    't(lang, "Setup & Reports", "设置与报表")',
  ]) assert.match(layout, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), title);

  assert.match(layout, /const operationsAdminNavGroups = adminNavGroups/);
  assert.match(layout, /isOperationsAdminPathAllowed\(item\.href\)/);
  assert.equal(isOperationsAdminPathAllowed("/admin/renewals"), true);
  assert.equal(isOperationsAdminPathAllowed("/admin/finance/workbench"), false);
});

test("admin navigation is compact, searchable and remembers up to four favorites", () => {
  const nav = read("app/admin/AdminSidebarNavClient.tsx");
  assert.match(nav, /type="search"/);
  assert.match(nav, /sgt-admin-nav-open-group-v1/);
  assert.match(nav, /sgt-admin-nav-favorites-v1/);
  assert.match(nav, /const FAVORITES_LIMIT = 4/);
  assert.match(nav, /title=\{item\.description \|\| item\.label\}/);
  assert.doesNotMatch(nav, />\s*\{item\.description\}\s*</);
});

test("employee HR remains easy to find for admin, finance and teacher entry points", () => {
  const adminLayout = read("app/admin/layout.tsx");
  const teacherLayout = read("app/teacher/layout.tsx");
  assert.match(adminLayout, /href: "\/staff\/hr"/);
  assert.match(adminLayout, /const financeNavGroups = \[/);
  assert.match(teacherLayout, /t\(lang, "My Employment", "我的员工事务"\)/);
  assert.match(teacherLayout, /href: "\/staff\/hr"/);
});

test("teacher navigation is reduced to three self-service groups with search", () => {
  const layout = read("app/teacher/layout.tsx");
  const nav = read("app/teacher/TeacherSidebarNavClient.tsx");
  assert.match(layout, /t\(lang, "Today", "今天"\)/);
  assert.match(layout, /t\(lang, "My Teaching", "我的教学"\)/);
  assert.match(layout, /t\(lang, "My Employment", "我的员工事务"\)/);
  assert.doesNotMatch(layout, /title: t\(lang, "Finance", "财务"\)/);
  assert.match(nav, /type="search"/);
  assert.match(nav, /sgt-teacher-nav-open-group-v1/);
});
