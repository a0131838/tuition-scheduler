import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "miniapp", "boss-academic-parent");
const errors: string[] = [];

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function json<T>(relativePath: string) {
  try {
    return JSON.parse(read(relativePath)) as T;
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON (${String(error)})`);
    return {} as T;
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) errors.push(message);
}

const app = json<{
  pages?: string[];
  permission?: Record<string, unknown>;
  window?: { navigationBarBackgroundColor?: string; backgroundColor?: string };
  tabBar?: { selectedColor?: string };
}>("app.json");
const project = json<{
  appid?: string;
  libVersion?: string;
  setting?: { urlCheck?: boolean; uploadWithSourceMap?: boolean };
}>("project.config.json");
const config = read(path.join("utils", "config.js"));

assert(project.appid === "wxe7017f8545e8ad49", "project.config.json: unexpected AppID");
assert(project.setting?.urlCheck === true, "project.config.json: legal-domain checking must be enabled");
assert(project.setting?.uploadWithSourceMap === false, "project.config.json: source maps must be disabled for upload");
assert(Boolean(project.libVersion) && project.libVersion !== "latest", "project.config.json: libVersion must be pinned");
assert(config.includes('apiBaseUrl: "https://sgtmanage.com"'), "utils/config.js: production API base is required");
assert(!config.includes("localhost"), "utils/config.js: localhost is not allowed in a release build");
assert(/devMockOpenId:\s*""/.test(config), "utils/config.js: parent mock OpenID must be empty");
assert(/devMockStaffOpenId:\s*""/.test(config), "utils/config.js: staff mock OpenID must be empty");
assert(!Object.prototype.hasOwnProperty.call(app.permission ?? {}, "scope.writePhotosAlbum"), "app.json: invalid writePhotosAlbum permission found");
assert(app.window?.navigationBarBackgroundColor?.toLowerCase() === "#ec5e0a", "app.json: navigation color must match the GTIA logo orange");
assert(app.tabBar?.selectedColor?.toLowerCase() === "#ec5e0a", "app.json: tab selected color must match the GTIA logo orange");

const pages = app.pages ?? [];
assert(pages.length > 0, "app.json: no pages configured");
assert(new Set(pages).size === pages.length, "app.json: duplicate page paths found");
for (const page of pages) {
  for (const extension of ["js", "json", "wxml", "wxss"]) {
    const relativePath = `${page}.${extension}`;
    assert(fs.existsSync(path.join(ROOT, relativePath)), `${relativePath}: file missing`);
    if (extension === "json" && fs.existsSync(path.join(ROOT, relativePath))) json(relativePath);
  }
}

const visibleMarkup = pages.map((page) => read(`${page}.wxml`)).join("\n");
const styleSource = [read("app.wxss"), ...pages.map((page) => read(`${page}.wxss`))].join("\n").toLowerCase();
for (const phrase of ["出差", "第一版先支持", "移动工作台", "移动排课", "移动点名", "availability"]) {
  assert(!visibleMarkup.includes(phrase), `visible miniapp copy still contains internal wording: ${phrase}`);
}
for (const color of ["#123524", "#123d2b", "#0b3d2a", "#22324a"]) {
  assert(!styleSource.includes(color), `miniapp styles still contain legacy primary color: ${color}`);
}

const firstSchedulingJs = read("pages/staff-first-scheduling/staff-first-scheduling.js");
const coordinationJs = read("pages/staff-coordination/staff-coordination.js");
const requestNewJs = read("pages/staff-request-new/staff-request-new.js");
const searchPages = [
  "pages/staff-first-scheduling/staff-first-scheduling.wxml",
  "pages/staff-coordination/staff-coordination.wxml",
  "pages/staff-request-new/staff-request-new.wxml",
];
assert(firstSchedulingJs.includes("requestSeq") && firstSchedulingJs.includes("searchTimer"), "student scheduling search must keep debounce and stale-request protection");
assert(coordinationJs.includes("requestSeq") && coordinationJs.includes("searchTimer"), "coordination search must keep debounce and stale-request protection");
assert(requestNewJs.includes("studentSearchSeq") && requestNewJs.includes("searchTimer"), "student picker search must keep debounce and stale-request protection");
for (const searchPage of searchPages) {
  const markup = read(searchPage);
  assert(markup.includes('class="search-submit"') && markup.includes('class="search-clear"'), `${searchPage}: search and clear controls are required`);
}

assert(fs.existsSync(path.join(ROOT, "assets", "gt-educational-institute-logo.png")), "assets/gt-educational-institute-logo.png: brand logo is required");
for (const loginPage of ["pages/login/login.wxml", "pages/staff-login/staff-login.wxml"]) {
  assert(read(loginPage).includes('/assets/gt-educational-institute-logo.png'), `${loginPage}: GT Educational Institute logo is required`);
}
const parentLoginMarkup = read("pages/login/login.wxml");
const parentLoginScript = read("pages/login/login.js");
const staffLoginMarkup = read("pages/staff-login/staff-login.wxml");
const staffLoginScript = read("pages/staff-login/staff-login.js");
const appScript = read("app.js");
const guideAccountMarkup = read("pages/guide-account/guide-account.wxml");
const guideAccountScript = read("pages/guide-account/guide-account.js");
const guideNavMarkup = read("components/guide-nav/guide-nav.wxml");
assert(pages[0] === "pages/guide-home/guide-home", "consumer school guide must be the first mini-program page");
assert(parentLoginMarkup.includes("家长微信登录") && parentLoginMarkup.includes("返回新加坡学校指南"), "parent login must be a focused service login reached from the guide");
assert(!parentLoginMarkup.includes("进入员工端"), "parent login must not compete with the employee portal");
assert(!parentLoginMarkup.includes("我有邀请码") && !parentLoginMarkup.includes('bindtap="goBind"'), "parent invite binding must follow login instead of competing on the entry page");
assert(staffLoginMarkup.includes("员工微信登录") && staffLoginMarkup.includes("返回学校指南"), "staff login must be a separate portal with a guide return path");
assert(!staffLoginMarkup.includes("员工绑定码") && !staffLoginMarkup.includes('bindtap="goBind"'), "staff binding must follow the employee login check");
assert(parentLoginScript.includes('currentPortal === "parent"') && parentLoginScript.includes('currentPortal === "staff"'), "login must resume the last authenticated portal");
assert(staffLoginScript.includes("data.needsBind") && staffLoginScript.includes("/pages/staff-bind/staff-bind"), "unbound staff must continue automatically to staff binding");
assert(appScript.includes("current_portal") && appScript.includes("setCurrentPortal"), "app must persist the last-used portal");
assert(guideAccountMarkup.includes("家长微信登录") && guideAccountMarkup.includes("工作人员入口"), "guide account must contain both service portals below public tools");
assert(guideAccountScript.includes("parent_token") && guideAccountScript.includes("staff_token"), "guide account must recognise existing parent and staff sessions");
assert((guideNavMarkup.match(/class="dock-item/g) || []).length === 4 && guideNavMarkup.includes("找学校") && guideNavMarkup.includes("测评") && guideNavMarkup.includes("我的"), "school guide must use the four-destination consumer navigation");
assert(!read("pages/students/students.wxml").includes("员工端"), "authenticated parent pages must not expose the employee portal");
assert(!read("pages/students/students.js").includes("staff-login"), "authenticated parent pages must not navigate to employee login");
assert(read("pages/students/students.wxml").includes("退出家长登录"), "authenticated parents must have a visible logout action");
assert(read("pages/students/students.js").includes("/api/miniapp/auth/logout"), "parent logout must invalidate the server session");
assert(read("pages/students/students.js").includes("setCurrentStudent(null)"), "parent logout must clear the selected student");
assert(read("pages/staff-home/staff-home.wxml").includes("返回学校指南"), "authenticated staff must retain a low-priority guide return path");

const staffScheduleMarkup = read("pages/staff-schedule/staff-schedule.wxml");
const staffScheduleScript = read("pages/staff-schedule/staff-schedule.js");
assert(staffScheduleMarkup.includes("排课日历") && staffScheduleMarkup.includes("老师空档"), "staff schedule must expose calendar overview and teacher free slots");
assert(staffScheduleMarkup.includes("mode === 'month'") && staffScheduleMarkup.includes("mode === 'week'"), "staff schedule must retain month and week views");
assert(staffScheduleMarkup.includes("全部老师") || staffScheduleScript.includes("全部老师"), "staff schedule must support teacher filtering");
assert(staffScheduleScript.includes("requestSeq") && staffScheduleScript.includes("searchTimer"), "staff schedule search must keep debounce and stale-request protection");
assert(staffScheduleScript.includes("staff-first-scheduling") && staffScheduleScript.includes("preferredDate") === false, "calendar scheduling must enter the existing first-scheduling flow");
assert(read("pages/staff-first-scheduling/staff-first-scheduling.js").includes("preferredDate"), "first scheduling must preserve the calendar date");
const firstSchedulingOpenCandidate = firstSchedulingJs.slice(firstSchedulingJs.indexOf("openCandidate(e)"));
assert(firstSchedulingJs.includes("staff-student-scheduling") && firstSchedulingOpenCandidate.includes("studentSchedulingUrl"), "student selection must open the read-only scheduling workspace");
assert(!firstSchedulingOpenCandidate.includes("requestStaff("), "student selection must not create a ticket or write business data");
const studentSchedulingJs = read("pages/staff-student-scheduling/staff-student-scheduling.js");
assert(studentSchedulingJs.includes('intent: "coordination"') && studentSchedulingJs.includes("coordinationSummary: summary"), "coordination tickets must require an explicit reason");
assert(studentSchedulingJs.includes("本次直接排课不会创建工单"), "direct scheduling must state and preserve the no-ticket path");

const parentHomeMarkup = read("pages/home/home.wxml");
const parentHomeScript = read("pages/home/home.js");
const parentProgressMarkup = read("pages/progress/progress.wxml");
assert(parentHomeMarkup.includes("孩子现在怎么样") && parentHomeMarkup.includes("需要您处理") && parentHomeScript.includes("/dashboard"), "parent home must answer status and parent action from the stable dashboard");
assert(parentProgressMarkup.includes("本周概览") && parentProgressMarkup.includes("最近进展"), "parent progress must show weekly summary and timeline");
assert(parentProgressMarkup.includes("负责人") && parentProgressMarkup.includes("下次更新"), "parent progress must show ownership and the next update commitment");
assert(!parentProgressMarkup.includes("内部") && !parentProgressMarkup.includes("草稿"), "parent progress must not expose internal workflow wording");
assert(read("app.json").includes('"pages/progress/progress"') && read("app.json").includes('"text": "进展"') && !read("app.json").includes('"text": "财务"'), "parent tab bar must use the four-destination information architecture");
assert(read("pages/students/students.wxml").includes("课包、财务与合同") && !read("pages/students/students.wxml").includes("风险未设置"), "parent account centre must expose parent services without raw risk wording");

json("sitemap.json");

const result = {
  ok: errors.length === 0,
  appId: project.appid ?? null,
  libVersion: project.libVersion ?? null,
  pageCount: pages.length,
  apiBaseUrl: "https://sgtmanage.com",
  urlCheck: project.setting?.urlCheck === true,
  sourceMaps: project.setting?.uploadWithSourceMap === true,
  mockLoginEnabled: !(/devMockOpenId:\s*""/.test(config) && /devMockStaffOpenId:\s*""/.test(config)),
  brandColor: app.window?.navigationBarBackgroundColor ?? null,
  searchProtection: true,
  errors,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
