import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = "miniapp/boss-academic-parent";
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

test("login keeps parent and staff as separate portal flows", () => {
  const parentMarkup = read("pages/login/login.wxml");
  const parentScript = read("pages/login/login.js");
  const staffMarkup = read("pages/staff-login/staff-login.wxml");
  const staffScript = read("pages/staff-login/staff-login.js");

  assert.match(parentMarkup, /家长微信登录/);
  assert.match(parentMarkup, /进入员工端/);
  assert.doesNotMatch(parentMarkup, /我有邀请码|bindtap="goBind"/);
  assert.match(parentScript, /currentPortal === "staff"/);
  assert.match(parentScript, /currentPortal === "parent"/);

  assert.match(staffMarkup, /员工微信登录/);
  assert.match(staffMarkup, /返回家长端/);
  assert.doesNotMatch(staffMarkup, /员工绑定码|bindtap="goBind"/);
  assert.match(staffScript, /if \(data\.needsBind\)/);
  assert.match(staffScript, /staff-bind\/staff-bind/);
});

test("portal choice persists without exposing employee entry inside the parent portal", () => {
  const appSource = read("app.js");
  const parentStudents = read("pages/students/students.js");
  const parentStudentsMarkup = read("pages/students/students.wxml");
  const staffHome = read("pages/staff-home/staff-home.js");
  const staffHomeMarkup = read("pages/staff-home/staff-home.wxml");

  assert.match(appSource, /currentPortal/);
  assert.match(appSource, /current_portal/);
  assert.match(appSource, /setCurrentPortal\("parent"\)/);
  assert.match(appSource, /setCurrentPortal\("staff"\)/);
  assert.match(parentStudents, /setSession\(""\)/);
  assert.doesNotMatch(parentStudents, /goStaffPortal|staff-login/);
  assert.doesNotMatch(parentStudentsMarkup, /员工端|goStaffPortal/);
  assert.match(staffHome, /setStaffSession\("", null\)/);
  assert.match(staffHome, /setCurrentPortal\("parent"\)/);
  assert.match(staffHomeMarkup, /切换到家长端/);
});
