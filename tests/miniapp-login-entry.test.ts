import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = "miniapp/boss-academic-parent";
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

test("login keeps parent and staff as separate portal flows", () => {
  const parentMarkup = read("pages/login/login.wxml");
  const parentScript = read("pages/login/login.js");
  const staffMarkup = read("pages/staff-login/staff-login.wxml");
  const staffScript = read("pages/staff-login/staff-login.js");

  assert.match(parentMarkup, /家长微信登录/);
  assert.match(parentMarkup, /返回新加坡学校指南/);
  assert.doesNotMatch(parentMarkup, /我有邀请码|bindtap="goBind"/);
  assert.match(parentScript, /currentPortal === "staff"/);
  assert.match(parentScript, /currentPortal === "parent"/);

  assert.match(staffMarkup, /员工微信登录/);
  assert.match(staffMarkup, /返回学校指南/);
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
  assert.match(parentStudents, /\/api\/miniapp\/auth\/logout/);
  assert.match(parentStudents, /setCurrentStudent\(null\)/);
  assert.match(parentStudents, /setCurrentPortal\(""\)/);
  assert.match(parentStudentsMarkup, /退出家长登录/);
  assert.match(staffHome, /setStaffSession\("", null\)/);
  assert.match(staffHome, /setCurrentPortal\(""\)/);
  assert.match(staffHomeMarkup, /返回学校指南/);
});

test("parent logout invalidates the session and clears the selected student", async () => {
  const calls: string[] = [];
  let pageDefinition: Record<string, unknown> = {};
  const app = {
    setSession(value: string) {
      calls.push(`session:${value}`);
    },
    setCurrentStudent(value: unknown) {
      calls.push(`student:${String(value)}`);
    },
    setCurrentPortal(value: string) {
      calls.push(`portal:${value}`);
    }
  };
  const api = {
    request(path: string, options: { method?: string }) {
      calls.push(`request:${options.method || "GET"}:${path}`);
      return Promise.resolve({ ok: true });
    }
  };
  const wx = {
    showModal(options: { success(result: { confirm: boolean }): void }) {
      calls.push("confirm");
      options.success({ confirm: true });
    },
    reLaunch(options: { url: string }) {
      calls.push(`relaunch:${options.url}`);
    }
  };
  const source = read("pages/students/students.js");
  const script = new vm.Script(`(function (require, Page, getApp, wx) { ${source} })`);
  const loadPage = script.runInNewContext() as Function;
  loadPage(
    () => api,
    (definition: Record<string, unknown>) => { pageDefinition = definition; },
    () => app,
    wx
  );
  const context = {
    data: { loggingOut: false },
    setData(value: { loggingOut: boolean }) {
      this.data.loggingOut = value.loggingOut;
      calls.push(`loading:${String(value.loggingOut)}`);
    }
  };

  (pageDefinition.logout as Function).call(context);
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(calls, [
    "confirm",
    "loading:true",
    "request:POST:/api/miniapp/auth/logout",
    "session:",
    "student:null",
    "portal:",
    "relaunch:/pages/guide-account/guide-account"
  ]);
});
