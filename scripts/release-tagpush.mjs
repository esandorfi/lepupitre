import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(process.cwd(), ".");
const repoDir = fs.existsSync(path.join(rootDir, "desktop"))
  ? rootDir
  : path.resolve(rootDir, "..");

function git(command, options = {}) {
  return execSync(command, {
    encoding: "utf8",
    cwd: repoDir,
    stdio: options.stdio ?? "pipe",
  }).trim();
}

function gitOk(command) {
  try {
    execSync(command, { cwd: repoDir, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function parseVersion(value) {
  return /^(\d+)\.(\d+)\.(\d+)$/.test(value) ? value : null;
}

const desktopPackagePath = path.join(repoDir, "desktop", "package.json");
const desktopPackage = JSON.parse(fs.readFileSync(desktopPackagePath, "utf8"));
const version = parseVersion(desktopPackage.version);

if (!version) {
  console.error(`Invalid version in ${path.relative(repoDir, desktopPackagePath)}: ${desktopPackage.version}`);
  process.exit(1);
}

const tag = `v${version}`;
const status = git("git status --porcelain");
if (status) {
  console.error("Working tree is not clean. Commit or stash changes before tag/push.");
  process.exit(1);
}

const branch = git("git rev-parse --abbrev-ref HEAD");
if (branch === "HEAD") {
  console.error("Detached HEAD. Check out a branch before running release-tagpush.");
  process.exit(1);
}

if (gitOk(`git rev-parse -q --verify refs/tags/${tag}`)) {
  const taggedCommit = git(`git rev-list -n 1 ${tag}`);
  const headCommit = git("git rev-parse HEAD");
  if (taggedCommit === headCommit) {
    console.error(`Tag ${tag} already exists on the current commit.`);
  } else {
    console.error(`Tag ${tag} already exists on another commit (${taggedCommit.slice(0, 7)}).`);
  }
  process.exit(1);
}

execSync(`git tag ${tag}`, { cwd: repoDir, stdio: "inherit" });

try {
  execSync(`git push origin ${branch}`, { cwd: repoDir, stdio: "inherit" });
  execSync(`git push origin ${tag}`, { cwd: repoDir, stdio: "inherit" });
} catch (error) {
  console.error(`Failed to push branch or tag ${tag}.`);
  console.error("The local tag was created; inspect remote state before retrying.");
  throw error;
}

console.log(`Tagged and pushed ${tag} from branch ${branch}.`);
