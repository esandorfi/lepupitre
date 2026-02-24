import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(process.cwd(), ".");
const repoDir = fs.existsSync(path.join(rootDir, "desktop"))
  ? rootDir
  : path.resolve(rootDir, "..");

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const versionArg = args[0];
const changelogPath = path.join(repoDir, "CHANGELOG.md");

function parseVersion(value) {
  const match = value.match(/^v?(\d+\.\d+\.\d+)$/);
  return match ? match[1] : null;
}

function loadVersion() {
  if (versionArg) {
    const parsed = parseVersion(versionArg);
    if (!parsed) {
      throw new Error(`Invalid version: ${versionArg}`);
    }
    return parsed;
  }
  const desktopPackagePath = path.join(repoDir, "desktop", "package.json");
  if (!fs.existsSync(desktopPackagePath)) {
    throw new Error("Could not find desktop/package.json for version lookup.");
  }
  const pkg = JSON.parse(fs.readFileSync(desktopPackagePath, "utf8"));
  const parsed = parseVersion(pkg.version);
  if (!parsed) {
    throw new Error(`Invalid version in package.json: ${pkg.version}`);
  }
  return parsed;
}

function runGit(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function getExistingChangelog() {
  if (!fs.existsSync(changelogPath)) {
    return "# Changelog\n\n";
  }
  return fs.readFileSync(changelogPath, "utf8");
}

function isChangelogEmpty(content) {
  const body = content.replace(/^# Changelog\s*\n\n?/m, "");
  return body.trim().length === 0;
}

function extractLatestLoggedVersion(content) {
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^##\s+v?(\d+\.\d+\.\d+)/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function changelogContainsVersion(content, version) {
  return new RegExp(`^##\\s+v?${version}\\b`, "m").test(content);
}

function findTagForVersion(version) {
  const candidates = [`v${version}`, version];
  const tags = runGit("git tag").split("\n").filter(Boolean);
  for (const candidate of candidates) {
    if (tags.includes(candidate)) {
      return candidate;
    }
  }
  return null;
}

function getLatestGitTag() {
  const tags = runGit("git tag --sort=-creatordate").split("\n").filter(Boolean);
  return tags[0] ?? null;
}

function getCommitSubjects(range) {
  const cmd = range ? `git log ${range} --pretty=format:%s` : "git log --pretty=format:%s";
  const output = runGit(cmd);
  return output ? output.split("\n").filter(Boolean) : [];
}

function categorize(subject) {
  const match = subject.match(/^(\w+)(\([^)]+\))?:\s+(.*)$/);
  if (!match) {
    return { type: "other", text: subject };
  }
  const type = match[1].toLowerCase();
  return { type, text: subject };
}

function summarize(groups) {
  const summary = [];
  const map = [
    ["feat", "features"],
    ["fix", "fixes"],
    ["docs", "docs"],
    ["refactor", "refactors"],
    ["chore", "chores"],
    ["perf", "perf"],
    ["test", "tests"],
    ["build", "build"],
    ["ci", "ci"],
    ["style", "style"],
  ];
  for (const [key, label] of map) {
    const count = groups[key]?.length ?? 0;
    if (count > 0) {
      summary.push(`${count} ${label}`);
    }
  }
  if ((groups.other?.length ?? 0) > 0) {
    summary.push(`${groups.other.length} other`);
  }
  return summary.length ? summary.join(", ") : "no changes";
}

function formatSection(title, items) {
  if (!items || items.length === 0) {
    return "";
  }
  const lines = items.map((item) => `- ${item}`);
  return `### ${title}\n${lines.join("\n")}\n\n`;
}

function buildEntry(version, baseTag, subjects) {
  const groups = {};
  for (const subject of subjects) {
    const { type, text } = categorize(subject);
    groups[type] ||= [];
    groups[type].push(text);
  }

  const date = new Date().toISOString().slice(0, 10);
  const summaryLine = summarize(groups);
  const compareLine = baseTag ? `Comparing from ${baseTag} to HEAD.` : "Initial release notes.";

  let body = `## v${version} - ${date}\n`;
  body += `Summary: ${summaryLine}.\n`;
  body += `${compareLine}\n\n`;

  body += formatSection("Features", groups.feat);
  body += formatSection("Fixes", groups.fix);
  body += formatSection("Docs", groups.docs);
  body += formatSection("Refactors", groups.refactor);
  body += formatSection("Chores", groups.chore);
  body += formatSection("Tests", groups.test);
  body += formatSection("CI", groups.ci);
  body += formatSection("Build", groups.build);
  body += formatSection("Perf", groups.perf);
  body += formatSection("Style", groups.style);
  body += formatSection("Other", groups.other);

  return body;
}

const version = loadVersion();
const changelog = getExistingChangelog();
const changelogEmpty = isChangelogEmpty(changelog);

if (new RegExp(`^##\\s+v?${version}\\b`, "m").test(changelog)) {
  console.log(`Changelog already contains v${version}.`);
  process.exit(0);
}

const latestGitTag = getLatestGitTag();
if (latestGitTag) {
  const latestTagVersion = latestGitTag.replace(/^v/, "");
  if (latestTagVersion !== version && !changelogContainsVersion(changelog, latestTagVersion)) {
    console.error(
      `Changelog is missing the latest tag ${latestGitTag}. ` +
        `Run "pnpm -C desktop changelog ${latestTagVersion}" to backfill it first ` +
        `or delete the local tag if it was created accidentally ("git tag -d ${latestGitTag}").`
    );
    process.exit(1);
  }
}

const lastLoggedVersion = extractLatestLoggedVersion(changelog);
let baseTag = null;
if (lastLoggedVersion) {
  baseTag = findTagForVersion(lastLoggedVersion);
}
if (!baseTag) {
  baseTag = latestGitTag;
}
if (changelogEmpty && latestGitTag) {
  const latestTagVersion = latestGitTag.replace(/^v/, "");
  if (latestTagVersion === version) {
    baseTag = null;
  }
}

const range = baseTag ? `${baseTag}..HEAD` : "";
const subjects = getCommitSubjects(range);
const entry = buildEntry(version, baseTag, subjects);

const header = changelog.startsWith("# Changelog") ? "# Changelog\n\n" : "";
const rest = changelog.replace(/^# Changelog\s*\n\n?/m, "");
const updated = `${header}${entry}${rest}`;

fs.writeFileSync(changelogPath, updated, "utf8");
console.log(`Changelog updated: ${path.relative(repoDir, changelogPath)}`);
