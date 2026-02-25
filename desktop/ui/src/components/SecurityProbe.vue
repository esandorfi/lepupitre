<script setup lang="ts">
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../lib/i18n";

const { t } = useI18n();
const networkStatus = ref("idle");
const fsStatus = ref("idle");
const fsDetail = ref<string | null>(null);
const fsAllowedStatus = ref("idle");
const fsAllowedDetail = ref<string | null>(null);
const networkDetail = ref<string | null>(null);

const isWindows = navigator.userAgent.toLowerCase().includes("windows");
const probePath = isWindows
  ? "C:\\Windows\\System32\\drivers\\etc\\hosts"
  : "/etc/hosts";
const statusKeyMap: Record<string, string> = {
  idle: "status.idle",
  running: "status.running",
  allowed: "status.allowed",
  blocked: "status.blocked",
  error: "status.error",
};

function statusLabel(value: string) {
  return t(statusKeyMap[value] ?? value);
}

async function testNetwork() {
  networkStatus.value = "running";
  networkDetail.value = null;
  try {
    await fetch("https://example.com", { method: "GET" });
    networkStatus.value = "allowed";
  } catch (err) {
    networkStatus.value = "blocked";
    networkDetail.value = err instanceof Error ? err.message : String(err);
  }
}

async function testFs() {
  fsStatus.value = "running";
  fsDetail.value = null;
  try {
    await invoke("security_probe_fs", { path: probePath });
    fsStatus.value = "allowed";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("path_not_allowed")) {
      fsStatus.value = "blocked";
    } else {
      fsStatus.value = "error";
      fsDetail.value = message;
    }
  }
}

async function testFsAllowed() {
  fsAllowedStatus.value = "running";
  fsAllowedDetail.value = null;
  try {
    const allowedPath = await invoke<string>("security_prepare_appdata_file");
    await invoke("security_probe_fs", { path: allowedPath });
    fsAllowedStatus.value = "allowed";
  } catch (err) {
    fsAllowedStatus.value = "error";
    fsAllowedDetail.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <div class="app-panel app-panel-compact space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="app-subtle text-sm font-semibold uppercase tracking-[0.2em]">
          {{ t("security.title") }}
        </h3>
        <p class="app-muted text-xs">
          {{ t("security.subtitle") }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        class="app-button-secondary cursor-pointer rounded-full px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="networkStatus === 'running'"
        @click="testNetwork"
      >
        {{ t("security.test_network") }}
      </button>
      <button
        class="app-button-secondary cursor-pointer rounded-full px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="fsStatus === 'running'"
        @click="testFs"
      >
        {{ t("security.test_blocked") }}
      </button>
      <button
        class="app-button-secondary cursor-pointer rounded-full px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="fsAllowedStatus === 'running'"
        @click="testFsAllowed"
      >
        {{ t("security.test_appdata") }}
      </button>
    </div>

    <div class="app-muted grid gap-2 text-xs">
      <div>
        {{ t("security.network") }}:
        <span class="app-text">{{ statusLabel(networkStatus) }}</span>
        <span v-if="networkDetail" class="app-subtle">({{ networkDetail }})</span>
      </div>
      <div>
        {{ t("security.fs_blocked") }}:
        <span class="app-text">{{ statusLabel(fsStatus) }}</span>
        <span v-if="fsDetail" class="app-subtle">({{ fsDetail }})</span>
      </div>
      <div>
        {{ t("security.fs_appdata") }}:
        <span class="app-text">{{ statusLabel(fsAllowedStatus) }}</span>
        <span v-if="fsAllowedDetail" class="app-subtle">({{ fsAllowedDetail }})</span>
      </div>
    </div>
  </div>
</template>
