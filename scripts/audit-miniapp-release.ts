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

assert(fs.existsSync(path.join(ROOT, "assets", "boss-logo.png")), "assets/boss-logo.png: brand logo is required");
for (const loginPage of ["pages/login/login.wxml", "pages/staff-login/staff-login.wxml"]) {
  assert(read(loginPage).includes('/assets/boss-logo.png'), `${loginPage}: brand logo is required`);
}
const parentLoginMarkup = read("pages/login/login.wxml");
const parentLoginScript = read("pages/login/login.js");
const staffLoginMarkup = read("pages/staff-login/staff-login.wxml");
const staffLoginScript = read("pages/staff-login/staff-login.js");
const appScript = read("app.js");
assert(parentLoginMarkup.includes("家长微信登录") && parentLoginMarkup.includes("进入员工端"), "parent login must keep one primary action and a separate staff switch");
assert(!parentLoginMarkup.includes("我有邀请码") && !parentLoginMarkup.includes('bindtap="goBind"'), "parent invite binding must follow login instead of competing on the entry page");
assert(staffLoginMarkup.includes("员工微信登录") && staffLoginMarkup.includes("返回家长端"), "staff login must be a separate portal with a parent return path");
assert(!staffLoginMarkup.includes("员工绑定码") && !staffLoginMarkup.includes('bindtap="goBind"'), "staff binding must follow the employee login check");
assert(parentLoginScript.includes('currentPortal === "parent"') && parentLoginScript.includes('currentPortal === "staff"'), "login must resume the last authenticated portal");
assert(staffLoginScript.includes("data.needsBind") && staffLoginScript.includes("/pages/staff-bind/staff-bind"), "unbound staff must continue automatically to staff binding");
assert(appScript.includes("current_portal") && appScript.includes("setCurrentPortal"), "app must persist the last-used portal");
assert(!read("pages/students/students.wxml").includes("员工端"), "authenticated parent pages must not expose the employee portal");
assert(!read("pages/students/students.js").includes("staff-login"), "authenticated parent pages must not navigate to employee login");
assert(read("pages/staff-home/staff-home.wxml").includes("切换到家长端"), "authenticated staff must retain a low-priority parent switch");

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
