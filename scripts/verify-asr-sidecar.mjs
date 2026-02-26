import fs from "node:fs";
import path from "node:path";

const MAGIC_LINUX_ELF = "7f454c46";
const MAGIC_WINDOWS_PE = "4d5a";
const MAGIC_DARWIN = new Set([
  "cffaedfe",
  "feedfacf",
  "cefaedfe",
  "feedface",
  "cafebabe",
  "bebafeca",
]);
const MIN_BINARY_BYTES = 64 * 1024;

function repoRoot() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "desktop", "src-tauri", "sidecar"))) {
    return cwd;
  }
  return path.resolve(cwd, "..");
}

function targetPlatform() {
  const arg = process.argv.find((value) => value.startsWith("--platform="));
  if (!arg) {
    return process.platform;
  }
  const value = arg.slice("--platform=".length).trim().toLowerCase();
  if (value === "windows") {
    return "win32";
  }
  if (value === "macos") {
    return "darwin";
  }
  return value;
}

function expectedSidecarPath(rootDir, platform) {
  const file = platform === "win32" ? "lepupitre-asr.exe" : "lepupitre-asr";
  return path.join(rootDir, "desktop", "src-tauri", "sidecar", file);
}

function readHeaderHex(filePath, bytes) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const count = fs.readSync(fd, buffer, 0, bytes, 0);
    return buffer.subarray(0, count).toString("hex");
  } finally {
    fs.closeSync(fd);
  }
}

function readPrefixText(filePath, bytes) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const count = fs.readSync(fd, buffer, 0, bytes, 0);
    return buffer.subarray(0, count).toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function assertLooksBinary(filePath, platform) {
  const stats = fs.statSync(filePath);
  if (stats.size < MIN_BINARY_BYTES) {
    throw new Error(
      `sidecar too small (${stats.size} bytes): expected a real binary at ${filePath}`
    );
  }

  const prefixText = readPrefixText(filePath, 128);
  if (prefixText.includes("PLACEHOLDER:")) {
    throw new Error(`sidecar placeholder detected at ${filePath}`);
  }

  if (platform === "win32") {
    const magic = readHeaderHex(filePath, 2);
    if (magic !== MAGIC_WINDOWS_PE) {
      throw new Error(`invalid sidecar magic for Windows (${magic}) at ${filePath}`);
    }
    return;
  }

  if (platform === "linux") {
    const magic = readHeaderHex(filePath, 4);
    if (magic !== MAGIC_LINUX_ELF) {
      throw new Error(`invalid sidecar magic for Linux (${magic}) at ${filePath}`);
    }
    return;
  }

  if (platform === "darwin") {
    const magic = readHeaderHex(filePath, 4);
    if (!MAGIC_DARWIN.has(magic)) {
      throw new Error(`invalid sidecar magic for macOS (${magic}) at ${filePath}`);
    }
  }
}

function main() {
  const platform = targetPlatform();
  const rootDir = repoRoot();
  const sidecarPath = expectedSidecarPath(rootDir, platform);

  if (!fs.existsSync(sidecarPath)) {
    throw new Error(`missing sidecar binary at ${sidecarPath}`);
  }

  assertLooksBinary(sidecarPath, platform);
  console.log(`ASR sidecar verification OK: ${sidecarPath}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ASR sidecar verification failed: ${message}`);
  process.exit(1);
}
