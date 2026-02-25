import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../src", import.meta.url);
const rootPath = root.pathname;

const hardFailPatterns = [
  { name: "text-[10px]", regex: /text-\[10px\]/g },
  { name: "text-[11px]", regex: /text-\[11px\]/g },
  { name: "min-h-11", regex: /\bmin-h-11\b/g },
];

const softWarnPatterns = [
  { name: "legacy panel wrapper", regex: /app-surface[^"\n]*rounded-2xl[^"\n]*border[^"\n]*p-4/g },
  { name: "arbitrary h-11", regex: /\bh-11\b/g },
];

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listFiles(full));
      continue;
    }
    if (/\.(vue|ts)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function lineNumberAt(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

const files = listFiles(rootPath);
const errors = [];
const warnings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");

  for (const pattern of hardFailPatterns) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(source)) !== null) {
      errors.push({
        file: relative(process.cwd(), file),
        line: lineNumberAt(source, match.index),
        rule: pattern.name,
      });
    }
  }

  for (const pattern of softWarnPatterns) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(source)) !== null) {
      warnings.push({
        file: relative(process.cwd(), file),
        line: lineNumberAt(source, match.index),
        rule: pattern.name,
      });
    }
  }
}

if (warnings.length > 0) {
  console.log("Design guard warnings (non-blocking):");
  for (const warning of warnings) {
    console.log(`  - ${warning.file}:${warning.line} (${warning.rule})`);
  }
}

if (errors.length > 0) {
  console.error("Design guard failed:");
  for (const error of errors) {
    console.error(`  - ${error.file}:${error.line} (${error.rule})`);
  }
  process.exit(1);
}

console.log("Design guard passed.");
