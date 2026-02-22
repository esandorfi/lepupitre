import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(process.cwd(), ".");
const repoDir = fs.existsSync(path.join(rootDir, "desktop"))
  ? rootDir
  : path.resolve(rootDir, "..");

const args = process.argv.slice(2);
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

const desktopPackagePath = path.join(repoDir, "desktop", "package.json");
const uiPackagePath = path.join(repoDir, "desktop", "ui", "package.json");
const tauriConfigPath = path.join(repoDir, "desktop", "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(repoDir, "desktop", "src-tauri", "Cargo.toml");
const cargoLockPath = path.join(repoDir, "desktop", "src-tauri", "Cargo.lock");

const desktopPackage = JSON.parse(fs.readFileSync(desktopPackagePath, "utf8"));
const currentVersion = desktopPackage.version;
const nextVersion = bumpVersion(currentVersion, bump);

desktopPackage.version = nextVersion;
writeJson(desktopPackagePath, desktopPackage);

const uiPackage = JSON.parse(fs.readFileSync(uiPackagePath, "utf8"));
uiPackage.version = nextVersion;
writeJson(uiPackagePath, uiPackage);

updateTauriConfig(tauriConfigPath, nextVersion);
updateCargoToml(cargoTomlPath, nextVersion);
updateCargoLock(cargoLockPath, nextVersion);

if (!noChangelog) {
  const scriptPath = path.join(repoDir, "scripts", "changelog.mjs");
  execSync(`node ${scriptPath} ${nextVersion}`, { stdio: "inherit" });
}

if (!noTag) {
  execSync(`git tag v${nextVersion}`, { stdio: "inherit" });
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
