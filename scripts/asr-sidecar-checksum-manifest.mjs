import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const MANIFEST_SCHEMA_VERSION = "1.0.0";
const SIDECAR_FILES = ["lepupitre-asr", "lepupitre-asr.exe"];

function repoRoot() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "desktop", "src-tauri", "sidecar"))) {
    return cwd;
  }
  return path.resolve(cwd, "..");
}

function usage() {
  console.error(
    "Usage: node scripts/asr-sidecar-checksum-manifest.mjs <generate|verify> --manifest=<path> [--sidecar-dir=<path>] [--output=<path>]"
  );
  process.exit(1);
}

function requiredArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  if (!arg) {
    return null;
  }
  const value = arg.slice(prefix.length).trim();
  return value.length > 0 ? value : null;
}

function readFileSha256(filePath) {
  const hash = createHash("sha256");
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return hash.digest("hex");
}

function sidecarDir() {
  const explicit = requiredArg("--sidecar-dir=");
  if (explicit) {
    return path.resolve(explicit);
  }
  return path.join(repoRoot(), "desktop", "src-tauri", "sidecar");
}

function collectSidecarArtifacts(dirPath) {
  const artifacts = [];
  for (const filename of SIDECAR_FILES) {
    const filePath = path.join(dirPath, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`sidecar_file_missing:${filePath}`);
    }
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      throw new Error(`sidecar_not_file:${filePath}`);
    }
    artifacts.push({
      filename,
      bytes: stat.size,
      sha256: readFileSha256(filePath),
    });
  }
  return artifacts;
}

function generateManifest(manifestPath, dirPath) {
  const artifacts = collectSidecarArtifacts(dirPath);
  const payload = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sidecarDir: path.basename(dirPath),
    artifacts,
  };
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2));
  console.log(`ASR sidecar checksum manifest generated: ${manifestPath}`);
}

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`manifest_invalid_field:${field}`);
  }
}

function validateManifestPayload(payload) {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("manifest_invalid_json:payload_not_object");
  }
  assertNonEmptyString(payload.schemaVersion, "schemaVersion");
  if (payload.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    throw new Error(
      `manifest_schema_mismatch:${payload.schemaVersion}:${MANIFEST_SCHEMA_VERSION}`
    );
  }
  assertNonEmptyString(payload.generatedAt, "generatedAt");
  if (!Array.isArray(payload.artifacts) || payload.artifacts.length === 0) {
    throw new Error("manifest_invalid_field:artifacts");
  }
}

function verifyManifest(manifestPath, dirPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest_missing:${manifestPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  validateManifestPayload(payload);

  const manifestArtifacts = new Map(
    payload.artifacts.map((artifact) => [artifact.filename, artifact])
  );
  for (const filename of SIDECAR_FILES) {
    if (!manifestArtifacts.has(filename)) {
      throw new Error(`manifest_missing_artifact:${filename}`);
    }
  }

  const actualArtifacts = collectSidecarArtifacts(dirPath);
  for (const actual of actualArtifacts) {
    const expected = manifestArtifacts.get(actual.filename);
    if (!expected) {
      throw new Error(`manifest_missing_artifact:${actual.filename}`);
    }
    if (Number(expected.bytes) !== Number(actual.bytes)) {
      throw new Error(
        `manifest_bytes_mismatch:${actual.filename}:${expected.bytes}:${actual.bytes}`
      );
    }
    if (
      typeof expected.sha256 !== "string" ||
      expected.sha256.toLowerCase() !== actual.sha256.toLowerCase()
    ) {
      throw new Error(
        `manifest_sha256_mismatch:${actual.filename}:${expected.sha256}:${actual.sha256}`
      );
    }
  }

  console.log(`ASR sidecar checksum manifest verified: ${manifestPath}`);
}

function main() {
  const mode = process.argv[2];
  if (!mode || (mode !== "generate" && mode !== "verify")) {
    usage();
  }
  const defaultManifestPath = path.join(
    sidecarDir(),
    "asr-sidecar-checksums.json"
  );
  const manifestPath = path.resolve(
    requiredArg("--manifest=") ?? requiredArg("--output=") ?? defaultManifestPath
  );
  const dirPath = sidecarDir();

  if (mode === "generate") {
    generateManifest(manifestPath, dirPath);
    return;
  }

  verifyManifest(manifestPath, dirPath);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ASR sidecar checksum manifest failed: ${message}`);
  process.exit(1);
}
