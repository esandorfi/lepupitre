#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const sidecarName = isWindows ? "lepupitre-asr.exe" : "lepupitre-asr";
const sourceBuiltSidecar = path.join(
  rootDir,
  "desktop",
  "asr-sidecar",
  "target",
  "release",
  sidecarName
);
const destinationSidecar = path.join(
  rootDir,
  "desktop",
  "src-tauri",
  "sidecar",
  sidecarName
);
const destinationDebugSidecar = path.join(
  rootDir,
  "desktop",
  "src-tauri",
  "target",
  "debug",
  "sidecar",
  sidecarName
);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
    ...options,
  });
  return {
    status: typeof result.status === "number" ? result.status : null,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ?? null,
  };
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function copySidecar(sourcePath, destinationPath) {
  ensureDirectory(destinationPath);
  fs.copyFileSync(sourcePath, destinationPath);
  if (!isWindows) {
    fs.chmodSync(destinationPath, 0o755);
  }
}

function verifyDoctorContract(sidecarPath) {
  if (!fs.existsSync(sidecarPath)) {
    return { ok: false, reason: `sidecar_missing:${sidecarPath}` };
  }

  const version = run(sidecarPath, ["--version"]);
  if (version.error) {
    return { ok: false, reason: `sidecar_version_spawn_failed:${version.error.message}` };
  }
  if (version.status !== 0) {
    return {
      ok: false,
      reason: `sidecar_version_failed:${version.status}:${version.stderr.trim()}`,
    };
  }

  const doctor = run(sidecarPath, ["doctor", "--json"]);
  if (doctor.error) {
    return { ok: false, reason: `sidecar_doctor_spawn_failed:${doctor.error.message}` };
  }
  if (doctor.status !== 0) {
    return {
      ok: false,
      reason: `sidecar_doctor_failed:${doctor.status}:${doctor.stderr.trim()}`,
    };
  }

  const raw = doctor.stdout.trim();
  if (!raw) {
    return { ok: false, reason: "sidecar_doctor_empty_stdout" };
  }

  try {
    const payload = JSON.parse(raw);
    const protocol = payload?.protocolVersion;
    const capabilities = Array.isArray(payload?.capabilities) ? payload.capabilities : [];
    if (protocol !== "1.0.0") {
      return { ok: false, reason: `sidecar_protocol_mismatch:${protocol ?? "unknown"}` };
    }
    if (!capabilities.includes("mode_live_final")) {
      return { ok: false, reason: "sidecar_missing_capability:mode_live_final" };
    }
  } catch (error) {
    return {
      ok: false,
      reason: `sidecar_doctor_json_parse_failed:${error instanceof Error ? error.message : String(error)}`,
    };
  }

  return { ok: true, reason: "ok" };
}

function buildSidecar() {
  const result = run("cargo", [
    "build",
    "--release",
    "--manifest-path",
    path.join("desktop", "asr-sidecar", "Cargo.toml"),
  ]);
  if (result.error) {
    throw new Error(`sidecar_build_spawn_failed:${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `sidecar_build_failed:${result.status}:${result.stderr.trim() || result.stdout.trim()}`
    );
  }
}

function main() {
  const initialCheck = verifyDoctorContract(destinationSidecar);
  if (initialCheck.ok) {
    console.log(`ASR dev sidecar ready: ${destinationSidecar}`);
    return;
  }

  console.log(`ASR dev sidecar refresh required: ${initialCheck.reason}`);
  buildSidecar();
  if (!fs.existsSync(sourceBuiltSidecar)) {
    throw new Error(`sidecar_build_output_missing:${sourceBuiltSidecar}`);
  }

  copySidecar(sourceBuiltSidecar, destinationSidecar);
  copySidecar(sourceBuiltSidecar, destinationDebugSidecar);

  const refreshedCheck = verifyDoctorContract(destinationSidecar);
  if (!refreshedCheck.ok) {
    throw new Error(`sidecar_refresh_failed:${refreshedCheck.reason}`);
  }
  console.log(`ASR dev sidecar refreshed: ${destinationSidecar}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ASR dev sidecar ensure failed: ${message}`);
  process.exit(1);
}
