import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "miniapp/boss-academic-parent");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("school guide is the consumer-first mini-program entry", () => {
  const app = JSON.parse(read("app.json"));
  const home = read("pages/guide-home/guide-home.wxml");
  assert.equal(app.pages[0], "pages/guide-home/guide-home");
  assert.match(home, /选学校、查考试/);
  assert.match(home, /找学校/);
  assert.match(home, /查入学考试/);
  assert.match(home, /测学习水平/);
  assert.doesNotMatch(home, /家长登录|员工登录|选择身份/);
});

test("public guide navigation separates discovery, assessment and account", () => {
  const nav = read("components/guide-nav/guide-nav.wxml");
  const navScript = read("components/guide-nav/guide-nav.js");
  assert.equal((nav.match(/class="dock-item/g) || []).length, 4);
  assert.match(nav, /首页/);
  assert.match(nav, /找学校/);
  assert.match(nav, /测评/);
  assert.match(nav, /我的/);
  assert.match(navScript, /guide-assessments/);
  assert.match(navScript, /guide-account/);
});

test("parent and employee portals live under guide account without mixing roles", () => {
  const account = read("pages/guide-account/guide-account.wxml");
  const accountScript = read("pages/guide-account/guide-account.js");
  const parentLogin = read("pages/login/login.wxml");
  const staffLogin = read("pages/staff-login/staff-login.wxml");
  assert.match(account, /游客工具无需登录/);
  assert.match(account, /家长微信登录/);
  assert.match(account, /工作人员入口/);
  assert.match(accountScript, /parent_token/);
  assert.match(accountScript, /staff_token/);
  assert.doesNotMatch(parentLogin, /进入员工端/);
  assert.match(staffLogin, /返回学校指南/);
});

test("assessment hub explains selection and readiness as different jobs", () => {
  const hub = read("pages/guide-assessments/guide-assessments.wxml");
  assert.match(hub, /智能选校/);
  assert.match(hub, /约2分钟/);
  assert.match(hub, /入学准备度测评/);
  assert.match(hub, /约30–45分钟/);
  assert.match(hub, /不是学校、MOE或AEIS官方成绩/);
});
