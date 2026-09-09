const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--check")) throw new Error("Only --check is supported; the version comes from utils/config.js.");
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const relativeProject = "miniapp/boss-academic-parent";
const project = path.join(root, relativeProject);
const config = require(path.join(project, "utils/config.js"));
const projectConfig = JSON.parse(fs.readFileSync(path.join(project, "project.config.json"), "utf8"));
if (!/^\d+\.\d+\.\d{2}$/.test(config.clientVersion)) throw new Error("Expected a version such as 1.1.01.");
const git = (...argv) => execFileSync("git", argv, { cwd: root, encoding: "utf8" }).trim();
if (git("status", "--porcelain", "--untracked-files=normal", "--", relativeProject)) throw new Error("Commit the intended Mini Program source before uploading.");
execFileSync("npm", ["run", "miniapp:audit-release"], { cwd: root, stdio: "inherit" });
const files = git("ls-files", "--", relativeProject).split("\n").filter(Boolean);
const manifest = {
  version: config.clientVersion,
  appId: projectConfig.appid,
  commit: git("rev-parse", "HEAD"),
  apiBaseUrl: config.apiBaseUrl,
  files: Object.fromEntries(files.map((file) => [file.slice(relativeProject.length + 1), createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex")])),
};
console.log(JSON.stringify({ version: manifest.version, appId: manifest.appId, commit: manifest.commit, fileCount: files.length, developmentOnly: true }));
if (!args.includes("--check")) {
  const cli = process.env.WECHAT_DEVTOOLS_CLI || "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
  if (!fs.existsSync(cli)) throw new Error("Set WECHAT_DEVTOOLS_CLI to the installed Developer Tools CLI.");
  const output = path.join(root, "output", "miniapp");
  fs.mkdirSync(output, { recursive: true });
  const prefix = path.join(output, `${manifest.version}-${Date.now()}`);
  const infoPath = `${prefix}-upload.json`;
  fs.writeFileSync(infoPath, "{}");
  fs.writeFileSync(`${prefix}-manifest.json`, JSON.stringify(manifest, null, 2));
  const result = spawnSync(cli, ["upload", "--project", project, "--version", manifest.version,
    "--desc", `开发测试 ${manifest.version}；代码 ${manifest.commit.slice(0, 8)}；工单结果核验。未提交审核，不发布正式版。`, "--info-output", infoPath],
  { cwd: root, encoding: "utf8", timeout: 240000, maxBuffer: 8 * 1024 * 1024 });
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  const info = JSON.parse(fs.readFileSync(infoPath, "utf8"));
  // Developer Tools can exit zero on an upload error, so also require its success receipt.
  if (result.error || result.status !== 0 || !/✔\s*upload|代码上传成功/.test((result.stdout || "") + (result.stderr || "")) || !(info.size?.total > 0)) {
    throw new Error("Upload was not confirmed. No review or production release was requested.");
  }
  fs.writeFileSync(`${prefix}-receipt.json`, JSON.stringify({ version: manifest.version, commit: manifest.commit, uploadedAt: new Date().toISOString(), size: info.size, developmentOnly: true }, null, 2));
  console.log(`Development upload confirmed: ${manifest.version}`);
}
