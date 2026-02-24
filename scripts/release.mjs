import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(process.cwd(), ".");
const repoDir = fs.existsSync(path.join(rootDir, "desktop"))
  ? rootDir
  : path.resolve(rootDir, "..");

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const bump = args[0];
const noTag = args.includes("--no-tag");
const noChangelog = args.includes("--no-changelog");
const doCommit = args.includes("--commit");
const doPush = args.includes("--push");

if (!bump) {
  console.error(
    "Usage: node scripts/release.mjs <patch|minor|major|x.y.z> [--no-tag] [--no-changelog] [--commit] [--push]"
  );
  process.exit(1);
}

function parseVersion(value) {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }
  return match.slice(1).map((part) => Number.parseInt(part, 10));
}

function bumpVersion(current, kind) {
  const parts = parseVersion(current);
  if (!parts) {
    throw new Error(`Invalid version: ${current}`);
  }
  const [major, minor, patch] = parts;
  if (kind === "major") {
    return `${major + 1}.0.0`;
  }
  if (kind === "minor") {
    return `${major}.${minor + 1}.0`;
  }
  if (kind === "patch") {
    return `${major}.${minor}.${patch + 1}`;
  }
  const direct = parseVersion(kind);
  if (direct) {
    return kind;
  }
  throw new Error(`Unknown bump type: ${kind}`);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function updateCargoToml(filePath, nextVersion) {
  const contents = fs.readFileSync(filePath, "utf8");
  const updated = contents.replace(
    /(\[package\][\s\S]*?^version = ")([^"]+)(")/m,
    `$1${nextVersion}$3`
  );
  if (contents === updated) {
    throw new Error(`Failed to update version in ${filePath}`);
  }
  fs.writeFileSync(filePath, updated, "utf8");
}

function updateCargoLock(filePath, nextVersion) {
  const contents = fs.readFileSync(filePath, "utf8");
  const updated = contents.replace(
    /(\[\[package\]\][\s\S]*?^name = "lepupitre"\n^version = ")([^"]+)(")/m,
    `$1${nextVersion}$3`
  );
  if (contents === updated) {
    throw new Error(`Failed to update version in ${filePath}`);
  }
  fs.writeFileSync(filePath, updated, "utf8");
}

function updateTauriConfig(filePath, nextVersion) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  data.version = nextVersion;
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function git(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function gitOk(command) {
  try {
    execSync(command, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const desktopPackagePath = path.join(repoDir, "desktop", "package.json");
const uiPackagePath = path.join(repoDir, "desktop", "ui", "package.json");
const tauriConfigPath = path.join(repoDir, "desktop", "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(repoDir, "desktop", "src-tauri", "Cargo.toml");
const cargoLockPath = path.join(repoDir, "desktop", "src-tauri", "Cargo.lock");
const changelogPath = path.join(repoDir, "CHANGELOG.md");
const changelogScriptPath = path.join(repoDir, "scripts", "changelog.mjs");

const desktopPackage = JSON.parse(fs.readFileSync(desktopPackagePath, "utf8"));
const currentVersion = desktopPackage.version;
const nextVersion = bumpVersion(currentVersion, bump);
const nextTag = `v${nextVersion}`;

if (!noTag && gitOk(`git rev-parse -q --verify refs/tags/${nextTag}`)) {
  console.error(`Tag ${nextTag} already exists.`);
  process.exit(1);
}

if (!noChangelog) {
  const currentTag = `v${currentVersion}`;
  const hasCurrentTag = gitOk(`git rev-parse -q --verify refs/tags/${currentTag}`);
  const changelog = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, "utf8")
    : "";
  const changelogHasCurrent = new RegExp(`^##\\s+v?${currentVersion}\\b`, "m").test(changelog);

  if (hasCurrentTag && !changelogHasCurrent) {
    console.log(`Backfilling changelog entry for ${currentTag} before bumping version...`);
    execSync(`node ${changelogScriptPath} ${currentVersion}`, { stdio: "inherit" });
  }
}

desktopPackage.version = nextVersion;
writeJson(desktopPackagePath, desktopPackage);

const uiPackage = JSON.parse(fs.readFileSync(uiPackagePath, "utf8"));
uiPackage.version = nextVersion;
writeJson(uiPackagePath, uiPackage);

updateTauriConfig(tauriConfigPath, nextVersion);
updateCargoToml(cargoTomlPath, nextVersion);
updateCargoLock(cargoLockPath, nextVersion);

if (!noChangelog) {
  execSync(`node ${changelogScriptPath} ${nextVersion}`, { stdio: "inherit" });
}

if (!noTag) {
  execSync(`git tag ${nextTag}`, { stdio: "inherit" });
}

if (doCommit) {
  execSync("git add -A", { stdio: "inherit" });
  const status = git("git status --porcelain");
  if (status) {
    execSync(`git commit -m "chore(release): v${nextVersion}"`, { stdio: "inherit" });
  } else {
    console.log("No changes to commit.");
  }
}

if (doPush) {
  const branch = git("git rev-parse --abbrev-ref HEAD");
  execSync(`git push origin ${branch}`, { stdio: "inherit" });
  if (!noTag) {
    execSync(`git push origin v${nextVersion}`, { stdio: "inherit" });
  }
}

console.log(`Version bumped to ${nextVersion}`);
