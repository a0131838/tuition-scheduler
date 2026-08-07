import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "miniapp/boss-academic-parent");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("school guide is the consumer-first mini-program entry", () => {
  const app = JSON.parse(read("app.json"));
  const home = read("pages/guide-home/guide-home.wxml");
  const homeStyle = read("pages/guide-home/guide-home.wxss");
  const homeScript = read("pages/guide-home/guide-home.js");
  assert.equal(app.pages[0], "pages/guide-home/guide-home");
  assert.match(home, /为孩子找到/);
  assert.match(home, /找学校/);
  assert.match(home, /智能选校/);
  assert.match(home, /入学考试/);
  assert.match(home, /英文测评/);
  assert.doesNotMatch(home, /家长登录|员工登录|选择身份/);
  assert.doesNotMatch(home, /01|02|03|先获得清楚的信息/);
  assert.doesNotMatch(homeStyle, /min-height:\s*430rpx/);
  assert.match(homeStyle, /justify-content:\s*flex-start/);
  assert.match(home, /consumer-school-logo/);
  assert.match(homeScript, /SCHOOL_IDENTITIES/);
  assert.match(homeScript, /shortMark:\s*"SAS"/);
});

test("public guide navigation separates discovery, assessment and account", () => {
  const nav = read("components/guide-nav/guide-nav.wxml");
  const navScript = read("components/guide-nav/guide-nav.js");
  assert.equal((nav.match(/class="dock-item/g) || []).length, 4);
  assert.match(nav, /首页/);
  assert.match(nav, /学校/);
  assert.match(nav, /测评/);
  assert.match(nav, /我的/);
  assert.doesNotMatch(nav, /[⌂⌕◎◇]/);
  assert.match(navScript, /guide-assessments/);
  assert.match(navScript, /guide-account/);
});

test("parent and employee portals live under guide account without mixing roles", () => {
  const account = read("pages/guide-account/guide-account.wxml");
  const accountScript = read("pages/guide-account/guide-account.js");
  const parentLogin = read("pages/login/login.wxml");
  const staffLogin = read("pages/staff-login/staff-login.wxml");
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
  assert.match(hub, /英文水平测评/);
  assert.match(hub, /约30–45分钟/);
  assert.match(hub, /不是官方成绩或录取结果/);
});

test("guide metadata is visually secondary and long detail starts collapsed", () => {
  const schoolDetail = read("pages/guide-school-detail/guide-school-detail.wxml");
  const schoolDetailScript = read("pages/guide-school-detail/guide-school-detail.js");
  const institutionDetail = read("pages/guide-institution-detail/guide-institution-detail.wxml");
  const pathway = read("pages/guide-pathway/guide-pathway.wxml");
  assert.doesNotMatch(schoolDetail.match(/<view class="guide-hero[\s\S]*?<\/view>\s*<\/view>/)?.[0] || "", /更新|复核/);
  assert.match(schoolDetail, /guide-page-meta[\s\S]*下次复核/);
  assert.match(schoolDetailScript, /overviewOpen: false/);
  assert.match(schoolDetailScript, /open: false/);
  assert.match(institutionDetail, /partner\.open/);
  assert.match(institutionDetail, /guide-page-meta/);
  assert.match(pathway, /openSections\.rules/);
  assert.match(pathway, /guide-page-meta/);
});
