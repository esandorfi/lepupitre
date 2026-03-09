#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const uiSrcRoot = join(repoRoot, "desktop", "ui", "src");
const featuresRoot = join(repoRoot, "desktop", "ui", "src", "features");

/**
 * Collects all `.vue` files in a directory tree.
 */
function collectVueFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectVueFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".vue")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Collects all `.ts` files in a directory tree.
 */
function collectTsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function toPosix(pathValue) {
  return pathValue.replace(/\\/g, "/");
}

function lineFromIndex(source, index) {
  return source.slice(0, index).split("\n").length;
}

function firstMatchLine(source, pattern) {
  const match = pattern.exec(source);
  if (!match || typeof match.index !== "number") {
    return 1;
  }
  return lineFromIndex(source, match.index);
}

const errors = [];
const vueFiles = collectVueFiles(featuresRoot);
const tsFiles = collectTsFiles(uiSrcRoot).filter((file) => {
  if (file.endsWith(".test.ts") || file.endsWith(".types.ts")) {
    return false;
  }
  return !/i18n\.messages\.(en|fr)\.ts$/.test(file);
});

function hasJsDocBefore(lines, lineIndex) {
  let cursor = lineIndex - 1;
  while (cursor >= 0 && lines[cursor].trim() === "") {
    cursor -= 1;
  }
  if (cursor < 0 || lines[cursor].trim() !== "*/") {
    return false;
  }
  for (let k = cursor - 1; k >= 0; k -= 1) {
    const trimmed = lines[k].trim();
    if (trimmed.startsWith("/**")) {
      return true;
    }
    if (
      trimmed === "" ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*")
    ) {
      continue;
    }
    break;
  }
  return false;
}

for (const file of vueFiles) {
  const content = readFileSync(file, "utf8");
  const relPath = toPosix(relative(repoRoot, file));
  const isComponent = relPath.includes("/components/");
  const isPage = relPath.includes("/pages/");

  if (/:t=/.test(content)) {
    const line = firstMatchLine(content, /:t=/);
    errors.push(
      `${relPath}:${line} - Forbidden \`:t=\` prop usage in feature SFCs (component must own local i18n).`
    );
  }

  if (isComponent) {
    const tPropPattern =
      /defineProps\s*<[\s\S]*?\bt\s*:\s*\(key:\s*string\)\s*=>\s*string[\s\S]*?>\s*\(/m;
    if (tPropPattern.test(content)) {
      const line = firstMatchLine(content, tPropPattern);
      errors.push(
        `${relPath}:${line} - Forbidden \`t\` translation prop in feature component \`defineProps\` contract.`
      );
    }
  }

  if (isPage) {
    if (!/Page composition root/.test(content)) {
      errors.push(
        `${relPath}:1 - Feature page roots must include one \`Page composition root\` header block in \`<script setup>\`.`
      );
    }

    const pageComposablePattern = /use[A-Za-z0-9]+Page(?:State|Controller)\s*\(/;
    if (!pageComposablePattern.test(content)) {
      continue;
    }

    const vmBindingPattern =
      /const\s+vm\s*=\s*(?:reactive\s*\(\s*)?use[A-Za-z0-9]+Page(?:State|Controller)\s*\(/m;
    if (!vmBindingPattern.test(content)) {
      const line = firstMatchLine(content, pageComposablePattern);
      errors.push(
        `${relPath}:${line} - Page using \`use*PageState/use*PageController\` must bind a single \`vm\` variable.`
      );
    }

    const destructurePattern =
      /const\s*\{[\s\S]*?\}\s*=\s*(?:reactive\s*\(\s*)?use[A-Za-z0-9]+Page(?:State|Controller)\s*\(/m;
    if (destructurePattern.test(content)) {
      const line = firstMatchLine(content, destructurePattern);
      errors.push(
        `${relPath}:${line} - Wide destructuring from \`use*PageState/use*PageController\` is forbidden; use \`vm.*\` consumption.`
      );
    }
  }
}

for (const file of tsFiles) {
  const content = readFileSync(file, "utf8");
  const relPath = toPosix(relative(repoRoot, file));
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^export\s+(async\s+)?function\s+([A-Za-z0-9_]+)/);
    if (!match) {
      continue;
    }
    if (!hasJsDocBefore(lines, i)) {
      errors.push(
        `${relPath}:${i + 1} - Exported UI functions must keep a JSDoc docstring block immediately above the declaration.`
      );
    }
  }
}

if (errors.length > 0) {
  console.error("UI feature rule check failed:");
  for (const error of errors) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

console.log("UI feature rule check passed.");
