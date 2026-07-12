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

const app = json<{ pages?: string[]; permission?: Record<string, unknown> }>("app.json");
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
  errors,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
