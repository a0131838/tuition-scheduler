import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("staff binding migration preserves accounts and changes uniqueness to WeChat plus user", () => {
  const migration = read("prisma/migrations/20260718090000_add_staff_miniapp_multi_account/migration.sql");
  const schema = read("prisma/schema.prisma");

  assert.match(migration, /ADD COLUMN "wechatOpenId" TEXT/);
  assert.match(migration, /DROP INDEX "StaffMiniappBinding_wechatOpenId_key"/);
  assert.match(migration, /UNIQUE INDEX "StaffMiniappBinding_wechatOpenId_userId_key"/);
  assert.doesNotMatch(migration, /DELETE FROM|TRUNCATE|DROP TABLE/);
  assert.match(schema, /@@unique\(\[wechatOpenId, userId\]\)/);
});

test("staff login requires an explicit account when one WeChat has multiple bindings", () => {
  const route = read("app/api/miniapp/staff/auth/login/route.ts");
  const staffLib = read("lib/miniapp-staff.ts");

  assert.match(route, /accounts\.length > 1/);
  assert.match(route, /needsAccountChoice: true/);
  assert.match(route, /accounts\.find\(\(account\) => account\.id === requestedUserId\)/);
  assert.match(route, /createStaffMiniappSession\(selected\.id, identity\.openId\)/);
  assert.match(staffLib, /wechatOpenId_userId/);
  assert.doesNotMatch(staffLib, /where: \{ wechatOpenId: input\.openId \}/);
});

test("authenticated account switching stays inside the current WeChat identity", () => {
  const route = read("app/api/miniapp/staff/accounts/route.ts");

  assert.match(route, /auth\.session\.wechatOpenId/);
  assert.match(route, /listStaffMiniappAccounts\(auth\.session\.wechatOpenId\)/);
  assert.match(route, /accounts\.find\(\(account\) => account\.id === userId\)/);
  assert.match(route, /createStaffMiniappSession\(selected\.id, auth\.session\.wechatOpenId\)/);
  assert.match(route, /403/);
});

test("miniapp exposes account choice, additional binding and in-app switching", () => {
  const appConfig = read("miniapp/boss-academic-parent/app.json");
  const loginScript = read("miniapp/boss-academic-parent/pages/staff-login/staff-login.js");
  const loginMarkup = read("miniapp/boss-academic-parent/pages/staff-login/staff-login.wxml");
  const switchScript = read("miniapp/boss-academic-parent/pages/staff-account-switch/staff-account-switch.js");
  const switchMarkup = read("miniapp/boss-academic-parent/pages/staff-account-switch/staff-account-switch.wxml");

  assert.match(appConfig, /pages\/staff-account-switch\/staff-account-switch/);
  assert.match(loginScript, /needsAccountChoice/);
  assert.match(loginScript, /loginStaffWithWeChat\(userId\)/);
  assert.match(loginMarkup, /选择工作账号/);
  assert.match(switchScript, /\/api\/miniapp\/staff\/accounts/);
  assert.match(switchScript, /setStaffSession\(data\.token, data\.staff\)/);
  assert.match(switchMarkup, /绑定另一个员工账号/);
});
