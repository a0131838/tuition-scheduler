const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync, spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const git = (...argv) => execFileSync("git", argv, { cwd: root, encoding: "utf8" }).trim();
const releaseRef = "refs/heads/feat/strict-superadmin-availability-bypass";
const ledgerRef = "refs/heads/codex/miniapp-releases";
const ledgerPath = "docs/miniapp-releases";
const relativeProject = "miniapp/boss-academic-parent";
const versionFile = relativeProject + "/utils/config.js";
const versionPattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.[0-9]{2}$/;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });

function compareVersions(left, right) {
  const rightParts = right.split(".");
  for (const [index, part] of left.split(".").entries()) {
    const difference = Number(part) - Number(rightParts[index]);
    if (difference) return difference;
  }
  return 0;
}

function remoteHeads() {
  const result = git("ls-remote", "--exit-code", "origin", releaseRef, ledgerRef);
  return new Map(result.split("\n").map((line) => line.split("\t").reverse()));
}

function readLedger(head) {
  // Fetch the shared history so status and preflight also work on a second workstation.
  git("fetch", "--no-tags", "origin", head);
  const records = git("ls-tree", "--name-only", head + ":" + ledgerPath)
    .split("\n").filter((name) => versionPattern.test(name)).sort(compareVersions);
  if (!records.length) throw new Error("No Mini Program version history found.");
  return records.map((version) => {
    const folder = ledgerPath + "/" + version;
    const files = git("ls-tree", "--name-only", head + ":" + folder).split("\n");
    const manifest = JSON.parse(git("show", head + ":" + folder + "/manifest.json"));
    const receipt = files.includes("receipt.json")
      ? JSON.parse(git("show", head + ":" + folder + "/receipt.json"))
      : null;
    const resolution = files.includes("resolution.json")
      ? JSON.parse(git("show", head + ":" + folder + "/resolution.json"))
      : null;
    if (manifest.version !== version || !manifest.commit || !manifest.files
      || (resolution && (receipt || resolution.version !== version || resolution.status !== "abandoned"
        || !resolution.verifiedBy?.trim() || !resolution.reason?.trim() || !Number.isFinite(Date.parse(resolution.verifiedAt))))
      || (receipt && (receipt.version !== version || receipt.commit !== manifest.commit
        || !receipt.developmentOnly || !(receipt.size?.total > 0) || !Number.isFinite(Date.parse(receipt.uploadedAt))))) {
      throw new Error("Invalid Mini Program ledger record: " + version);
    }
    if (receipt?.manifestSha256) {
      const bytes = execFileSync("git", ["show", head + ":" + folder + "/manifest.json"], { cwd: root });
      if (sha256(bytes) !== receipt.manifestSha256) throw new Error("Manifest hash differs for " + version);
    }
    return { manifest, receipt, resolution };
  });
}

function ensureAncestor(ancestor, commit, message) {
  const result = spawnSync("git", ["merge-base", "--is-ancestor", ancestor, commit], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(message + (result.stderr ? " " + result.stderr.trim() : ""));
}

function commitLedger(file, message) {
  git("add", "--", file);
  git("commit", "-m", message, "--", file);
}

function main() {
  const args = process.argv.slice(2);
  const [action, notes] = args;
  const check = action === "--check" && args.length === 1;
  const status = action === "--status" && args.length === 1;
  if (!check && !status && !(action === "--notes" && args.length === 2 && notes.trim())) {
    throw new Error('Use --status, --check, or --notes "Release summary".');
  }

  const heads = remoteHeads();
  const ledgerHead = heads.get(ledgerRef);
  if (!ledgerHead) throw new Error("Shared Mini Program release branch was not found.");
  const records = readLedger(ledgerHead);
  if (status) {
    for (const { manifest, receipt, resolution } of records) {
      let state = "reserved, upload unconfirmed";
      if (receipt) state = "development uploaded " + receipt.uploadedAt;
      if (resolution) state = "abandoned " + resolution.verifiedAt;
      console.log(manifest.version + "  " + manifest.commit + "  " + state);
    }
    const channels = JSON.parse(git("show", ledgerHead + ":" + ledgerPath + "/channels.json"));
    console.log("Last observed in WeChat Version Management (null means unverified):");
    console.log(JSON.stringify(channels, null, 2));
    return;
  }

  const latest = records.at(-1);
  const previousUpload = records.findLast(({ receipt }) => receipt);
  if (!previousUpload) throw new Error("No confirmed development upload found.");
  const project = path.join(root, relativeProject);
  const config = require(path.join(root, versionFile));
  const version = config.clientVersion;
  if (!versionPattern.test(version)) throw new Error("Expected a version such as 1.1.03.");
  if (records.some(({ receipt, resolution }) => !receipt && !resolution)) {
    throw new Error("An upload is unconfirmed. Reconcile the shared ledger before issuing another version.");
  }
  if (compareVersions(version, latest.manifest.version) <= 0) {
    throw new Error("Version " + version + " must be higher than the latest recorded version " + latest.manifest.version + ".");
  }
  if (git("status", "--porcelain", "--untracked-files=no") || git("status", "--porcelain", "--untracked-files=normal", "--", relativeProject, ledgerPath)) {
    throw new Error("Commit the intended source and keep the release ledger clean before uploading.");
  }
  const commit = git("rev-parse", "HEAD");
  ensureAncestor(ledgerHead, commit, "Update from the shared Mini Program release branch.");
  if (git("diff", "--name-only", ledgerHead, commit, "--", ledgerPath)) {
    throw new Error("The candidate must use the current shared release ledger.");
  }

  const currentRelease = heads.get(releaseRef);
  if (!currentRelease) throw new Error("Unable to verify the production source branch.");
  ensureAncestor(currentRelease, commit, "Fetch and merge the latest production source before preparing the candidate.");
  const changed = git("diff", "--name-only", "--no-renames", currentRelease, commit, "--", relativeProject);
  const stripVersion = (source) => source.replace(/^(\s*clientVersion:\s*)"[^"\r\n]+"/m, '$1"<release version>"');
  if ((changed && changed !== versionFile)
    || stripVersion(git("show", currentRelease + ":" + versionFile)) !== stripVersion(git("show", commit + ":" + versionFile))) {
    throw new Error("Mini Program source must match the latest production branch except for clientVersion.");
  }

  const files = git("ls-files", "--", relativeProject).split("\n").filter(Boolean);
  const hashes = Object.fromEntries(files.map((file) => [
    file.slice(relativeProject.length + 1),
    sha256(fs.readFileSync(path.join(root, file))),
  ]));
  const previousFiles = previousUpload.manifest.files;
  const deleted = Object.keys(previousFiles).filter((name) => !Object.hasOwn(hashes, name));
  if (deleted.length) throw new Error("Paths from the previous package are missing: " + deleted.join(", "));
  execFileSync("npm", ["run", "miniapp:audit-release"], { cwd: root, stdio: "inherit" });
  const manifest = {
    version,
    appId: JSON.parse(fs.readFileSync(path.join(project, "project.config.json"), "utf8")).appid,
    commit,
    currentRelease,
    apiBaseUrl: config.apiBaseUrl,
    previousVersion: previousUpload.manifest.version,
    notes,
    files: hashes,
  };
  console.log(JSON.stringify({
    version, commit, currentRelease, previousVersion: previousUpload.manifest.version,
    files: files.length,
    added: Object.keys(hashes).filter((name) => !Object.hasOwn(previousFiles, name)),
    changed: Object.keys(previousFiles).filter((name) => hashes[name] !== previousFiles[name]),
  }, null, 2));
  if (check) return;

  if (git("symbolic-ref", "--quiet", "HEAD") !== ledgerRef) {
    throw new Error("Run the upload from the local codex/miniapp-releases branch.");
  }
  const cli = process.env.WECHAT_DEVTOOLS_CLI || "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
  fs.accessSync(cli, fs.constants.X_OK);
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "sgt-miniapp-upload-"));
  try {
    const archive = execFileSync("git", ["archive", commit, relativeProject], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
    execFileSync("tar", ["-xf", "-", "-C", staging], { input: archive });
    const uploadProject = fs.realpathSync(path.join(staging, relativeProject));
    for (const [name, hash] of Object.entries(hashes)) {
      if (sha256(fs.readFileSync(path.join(uploadProject, name))) !== hash) {
        throw new Error("Staged Mini Program differs from committed source: " + name);
      }
    }

    const freshHeads = remoteHeads();
    if (freshHeads.get(releaseRef) !== currentRelease || freshHeads.get(ledgerRef) !== ledgerHead
      || git("rev-parse", "HEAD") !== commit) {
      throw new Error("The source or shared ledger advanced during preflight. Update and check again.");
    }
    const folder = path.join(ledgerPath, version);
    fs.mkdirSync(path.join(root, folder));
    const manifestPath = path.join(folder, "manifest.json");
    writeJson(path.join(root, manifestPath), manifest);
    commitLedger(manifestPath, "Reserve Mini Program development version " + version);
    // Reserve the version remotely before invoking WeChat. A competing writer's push must fail.
    git("push", "--atomic", "origin", "HEAD:" + ledgerRef, commit + ":refs/tags/miniapp/v" + version);

    const output = path.join(root, "output", "miniapp");
    fs.mkdirSync(output, { recursive: true });
    const infoPath = path.join(output, version + "-" + Date.now() + "-upload.json");
    writeJson(infoPath, {});
    const result = spawnSync(cli, ["upload", "--project", uploadProject, "--version", version,
      "--desc", version + " " + commit.slice(0, 8) + " " + notes.trim(), "--info-output", infoPath],
    { cwd: root, encoding: "utf8", timeout: 240000, maxBuffer: 8 * 1024 * 1024 });
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    const info = JSON.parse(fs.readFileSync(infoPath, "utf8"));
    // Developer Tools can exit zero on an upload error, so also require its success receipt.
    if (result.error || result.status !== 0 || !/✔\s*upload|代码上传成功/.test((result.stdout || "") + (result.stderr || "")) || !(info.size?.total > 0)) {
      throw new Error("Upload unconfirmed. Keep the reservation and reconcile it with WeChat before retrying.");
    }
    const receiptPath = path.join(folder, "receipt.json");
    writeJson(path.join(root, receiptPath), {
      version, commit, currentRelease, uploadedAt: new Date().toISOString(),
      manifestSha256: sha256(fs.readFileSync(path.join(root, manifestPath))),
      size: info.size, developmentOnly: true,
    });
    commitLedger(receiptPath, "Record Mini Program development upload " + version);
    git("push", "origin", "HEAD:" + ledgerRef);
    console.log("Development upload confirmed and recorded: " + version);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
