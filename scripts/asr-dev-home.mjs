#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const devHomeDir = path.resolve(rootDir, "..", "lepupitre-asr-dev");
const devBinDir = path.join(devHomeDir, "bin");
const devModelsDir = path.join(devHomeDir, "models");
const sidecarManifestPath = path.join(rootDir, "desktop", "asr-sidecar", "Cargo.toml");
const appManifestPath = path.join(rootDir, "desktop", "src-tauri", "Cargo.toml");
const releaseDir = path.join(rootDir, "desktop", "asr-sidecar", "target", "release");
const isWindows = process.platform === "win32";
const MODEL_SPECS = {
  tiny: {
    filename: "ggml-tiny.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
    sha256: "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21",
    sizeBytes: 77691713,
  },
  base: {
    filename: "ggml-base.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
    sha256: "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe",
    sizeBytes: 147951465,
  },
};

function run(cmd, args, extraEnv = {}) {
  const result = spawnSync(cmd, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: false,
  });
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
  if (result.error) {
    throw result.error;
  }
}

function guessLibclangPath() {
  if (process.env.LIBCLANG_PATH && process.env.LIBCLANG_PATH.trim().length > 0) {
    return process.env.LIBCLANG_PATH.trim();
  }
  const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
  const llvmBin = path.join(programFiles, "LLVM", "bin");
  if (existsSync(path.join(llvmBin, "libclang.dll"))) {
    return llvmBin;
  }
  return null;
}

function runSidecarBuild() {
  if (!isWindows) {
    run("cargo", ["build", "--release", "--manifest-path", sidecarManifestPath]);
    return;
  }

  if (!process.env.INCLUDE || process.env.INCLUDE.trim().length === 0) {
    throw new Error(
      "windows_sdk_env_missing: run from Developer PowerShell for VS (or call VsDevCmd) so INCLUDE/LIB are set"
    );
  }

  const libclangPath = guessLibclangPath();
  const jobs = process.env.CARGO_BUILD_JOBS?.trim() || "1";
  const extraEnv = { CARGO_BUILD_JOBS: jobs };
  if (libclangPath) {
    extraEnv.LIBCLANG_PATH = libclangPath;
  }
  run("cargo", ["build", "--release", "--manifest-path", sidecarManifestPath], extraEnv);
}

function ensureDevHome() {
  mkdirSync(devBinDir, { recursive: true });
  mkdirSync(devModelsDir, { recursive: true });
}

function sourceSidecarPaths() {
  return [
    path.join(releaseDir, "lepupitre-asr"),
    path.join(releaseDir, "lepupitre-asr.exe"),
  ];
}

function resolveDevSidecarPath() {
  const exePath = path.join(devBinDir, "lepupitre-asr.exe");
  const rawPath = path.join(devBinDir, "lepupitre-asr");
  if (existsSync(exePath)) {
    return exePath;
  }
  if (existsSync(rawPath)) {
    return rawPath;
  }
  throw new Error(`sidecar_missing: ${devBinDir}`);
}

function copyBuiltSidecarToDevHome() {
  ensureDevHome();

  let copied = false;
  for (const src of sourceSidecarPaths()) {
    if (!existsSync(src)) {
      continue;
    }
    const dest = path.join(devBinDir, path.basename(src));
    copyFileSync(src, dest);
    if (dest.endsWith("lepupitre-asr")) {
      chmodSync(dest, 0o755);
    }
    copied = true;
  }

  if (!copied) {
    throw new Error(`sidecar_build_output_missing: ${releaseDir}`);
  }

  const exePath = path.join(devBinDir, "lepupitre-asr.exe");
  const rawPath = path.join(devBinDir, "lepupitre-asr");
  if (!existsSync(rawPath) && existsSync(exePath)) {
    copyFileSync(exePath, rawPath);
    chmodSync(rawPath, 0o755);
  }
  if (!existsSync(exePath) && existsSync(rawPath)) {
    copyFileSync(rawPath, exePath);
  }
}

function usage() {
  console.error(
    "Usage: node scripts/asr-dev-home.mjs <create|copy-built|build-copy|model|smoke|dev> [model-id|model-path]"
  );
  process.exit(1);
}

function fileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const input = createReadStream(filePath);
    input.on("error", reject);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("end", () => resolve(hash.digest("hex")));
  });
}

function downloadFile(url, destPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 8) {
      reject(new Error("model_download_redirect_loop"));
      return;
    }

    const request = https.get(url, (response) => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      if (status >= 300 && status < 400 && typeof location === "string") {
        response.resume();
        const redirected = new URL(location, url).toString();
        downloadFile(redirected, destPath, redirectCount + 1).then(resolve).catch(reject);
        return;
      }
      if (status !== 200) {
        response.resume();
        reject(new Error(`model_download_http_${status}`));
        return;
      }
      const output = createWriteStream(destPath);
      response.on("error", reject);
      output.on("error", reject);
      output.on("finish", () => {
        output.close();
        resolve();
      });
      response.pipe(output);
    });
    request.on("error", reject);
  });
}

async function ensureDevModel(modelId) {
  ensureDevHome();
  const spec = MODEL_SPECS[modelId];
  if (!spec) {
    throw new Error(`model_unknown:${modelId}`);
  }

  const dest = path.join(devModelsDir, spec.filename);
  if (existsSync(dest)) {
    const size = statSync(dest).size;
    const sha = await fileSha256(dest);
    if (size === spec.sizeBytes && sha === spec.sha256) {
      console.log(`model ready: ${dest}`);
      return;
    }
    rmSync(dest, { force: true });
  }

  const partPath = `${dest}.part`;
  rmSync(partPath, { force: true });
  console.log(`downloading model '${modelId}' to ${dest}`);
  await downloadFile(spec.url, partPath);

  const size = statSync(partPath).size;
  const sha = await fileSha256(partPath);
  if (size !== spec.sizeBytes) {
    rmSync(partPath, { force: true });
    throw new Error(`model_size_mismatch:${size}:${spec.sizeBytes}`);
  }
  if (sha !== spec.sha256) {
    rmSync(partPath, { force: true });
    throw new Error(`model_checksum_mismatch:${sha}:${spec.sha256}`);
  }
  renameSync(partPath, dest);
  console.log(`model ready: ${dest}`);
}

const cmd = process.argv[2];

if (!cmd) {
  usage();
}

if (cmd === "create") {
  ensureDevHome();
  console.log(`created: ${devHomeDir}`);
  process.exit(0);
}

if (cmd === "copy-built") {
  copyBuiltSidecarToDevHome();
  console.log(`copied sidecar to: ${devBinDir}`);
  console.log(`models dir: ${devModelsDir}`);
  process.exit(0);
}

if (cmd === "build-copy") {
  runSidecarBuild();
  copyBuiltSidecarToDevHome();
  console.log(`copied sidecar to: ${devBinDir}`);
  console.log(`models dir: ${devModelsDir}`);
  process.exit(0);
}

if (cmd === "model") {
  const modelId = process.argv[3];
  if (!modelId) {
    usage();
  }
  await ensureDevModel(modelId);
  process.exit(0);
}

if (cmd === "smoke" || cmd === "dev") {
  const modelPathArg = process.argv[3];
  if (!modelPathArg) {
    usage();
  }
  const modelPath = path.resolve(modelPathArg);
  const sidecarPath = resolveDevSidecarPath();

  if (cmd === "smoke") {
    run(
      "cargo",
      [
        "test",
        "--manifest-path",
        appManifestPath,
        "asr_sidecar_smoke_decode",
        "--test",
        "asr_smoke",
      ],
      {
        LEPUPITRE_ASR_SMOKE: "1",
        LEPUPITRE_ASR_SIDECAR: sidecarPath,
        LEPUPITRE_ASR_MODEL_PATH: modelPath,
      }
    );
  } else {
    run(
      "pnpm",
      ["-C", "desktop", "dev"],
      {
        LEPUPITRE_ASR_SIDECAR: sidecarPath,
        LEPUPITRE_ASR_MODEL_PATH: modelPath,
      }
    );
  }
  process.exit(0);
}

usage();
