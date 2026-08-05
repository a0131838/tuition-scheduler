import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.join(process.cwd(), "miniapp", "boss-academic-parent");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("staff home presents distinct management, academic and teacher workspaces", () => {
  const script = read("pages/staff-home/staff-home.js");
  const template = read("pages/staff-home/staff-home.wxml");

  assert.match(script, /ADMIN: "管理工作台"/);
  assert.match(script, /CS: "教务工作台"/);
  assert.match(script, /TEACHER: "老师工作台"/);
  assert.match(script, /需要管理关注/);
  assert.match(script, /教学事务/);
  assert.match(script, /教务处理/);
  assert.match(template, /下一节课/);
  assert.match(template, /家长请求/);
  assert.match(template, /排课与调课/);
});

test("teacher priority opens the existing lesson detail without adding a write path", () => {
  const script = read("pages/staff-home/staff-home.js");

  assert.match(script, /\/api\/miniapp\/staff\/teacher\/dashboard/);
  assert.match(script, /staff-session-detail\?id=/);
  assert.doesNotMatch(script, /method:\s*"(?:POST|PATCH|DELETE)"/);
});

test("shared miniapp UI uses the restrained workspace visual system", () => {
  const appStyles = read("app.wxss");
  const appConfig = read("app.json");
  const parentHome = read("pages/home/home.wxml");

  assert.match(appStyles, /background: #f6f4f1/);
  assert.match(appStyles, /\.page-enter/);
  assert.match(appStyles, /border-radius: 16rpx/);
  assert.match(appConfig, /"navigationBarBackgroundColor": "#EC5E0A"/);
  assert.match(parentHome, /孩子现在怎么样/);
});
