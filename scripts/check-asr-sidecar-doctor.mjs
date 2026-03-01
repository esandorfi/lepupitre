import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const EXPECTED_PROTOCOL_VERSION = "1.0.0";
const REQUIRED_CAPABILITIES = [
  "decode_window_f32le",
  "progress_events",
  "mode_live_final",
];

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

function sidecarArgPath() {
  const arg = process.argv.find((value) => value.startsWith("--sidecar="));
  if (!arg) {
    return null;
  }
  const value = arg.slice("--sidecar=".length).trim();
  if (!value) {
    return null;
  }
  return path.resolve(value);
}

function expectedSidecarPath(rootDir, platform) {
  const file = platform === "win32" ? "lepupitre-asr.exe" : "lepupitre-asr";
  return path.join(rootDir, "desktop", "src-tauri", "sidecar", file);
}

function runSidecar(sidecarPath, args) {
  const result =
    process.platform === "win32"
      ? spawnSync(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            `& '${sidecarPath.replace(/'/g, "''")}' ${args
              .map((value) => `'${String(value).replace(/'/g, "''")}'`)
              .join(" ")}`,
          ],
          { encoding: "utf8", shell: false }
        )
      : spawnSync(sidecarPath, args, {
          encoding: "utf8",
          shell: false,
        });
  if (result.error) {
    throw new Error(`sidecar_exec_failed:${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `sidecar_exit_nonzero:${result.status}:${(result.stderr || "").trim()}`
    );
  }
  return result.stdout.trim();
}

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`doctor_invalid_field:${field}`);
  }
}

function validateDoctorPayload(payload) {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("doctor_invalid_json:payload_not_object");
  }

  assertNonEmptyString(payload.schemaVersion, "schemaVersion");
  assertNonEmptyString(payload.sidecarVersion, "sidecarVersion");
  assertNonEmptyString(payload.protocolVersion, "protocolVersion");
  assertNonEmptyString(payload.targetTriple, "targetTriple");

  if (payload.protocolVersion !== EXPECTED_PROTOCOL_VERSION) {
    throw new Error(
      `doctor_protocol_mismatch:${payload.protocolVersion}:${EXPECTED_PROTOCOL_VERSION}`
    );
  }

  if (!Array.isArray(payload.capabilities)) {
    throw new Error("doctor_invalid_field:capabilities");
  }
  for (const capability of REQUIRED_CAPABILITIES) {
    if (!payload.capabilities.includes(capability)) {
      throw new Error(`doctor_missing_capability:${capability}`);
    }
  }

  if (typeof payload.dependencies !== "object" || payload.dependencies === null) {
    throw new Error("doctor_invalid_field:dependencies");
  }
  assertNonEmptyString(payload.dependencies.whisperRs, "dependencies.whisperRs");
  assertNonEmptyString(payload.dependencies.whisperCpp, "dependencies.whisperCpp");
  assertNonEmptyString(
    payload.dependencies.whisperRuntime,
    "dependencies.whisperRuntime"
  );
  assertNonEmptyString(payload.dependencies.ggml, "dependencies.ggml");
}

function main() {
  const platform = targetPlatform();
  const rootDir = repoRoot();
  const sidecarPath =
    sidecarArgPath() ?? expectedSidecarPath(rootDir, platform);

  if (!fs.existsSync(sidecarPath)) {
    throw new Error(`sidecar_missing:${sidecarPath}`);
  }

  const versionOutput = runSidecar(sidecarPath, ["--version"]);
  if (!/^lepupitre-asr\s+\S+$/i.test(versionOutput)) {
    throw new Error(`version_output_invalid:${versionOutput}`);
  }

  const doctorRaw = runSidecar(sidecarPath, ["doctor", "--json"]);
  let doctorPayload;
  try {
    doctorPayload = JSON.parse(doctorRaw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`doctor_json_parse_failed:${message}`);
  }
  validateDoctorPayload(doctorPayload);

  console.log(`ASR sidecar doctor verification OK: ${sidecarPath}`);
  console.log(
    `ASR sidecar ${doctorPayload.sidecarVersion} protocol ${doctorPayload.protocolVersion} target ${doctorPayload.targetTriple}`
  );
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ASR sidecar doctor verification failed: ${message}`);
  process.exit(1);
}
