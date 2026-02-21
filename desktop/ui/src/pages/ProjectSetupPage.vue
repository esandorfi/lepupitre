<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";

const { t } = useI18n();
const title = ref("");
const audience = ref("");
const goal = ref("");
const duration = ref("");
const error = ref<string | null>(null);
const isSaving = ref(false);

const activeProfileId = computed(() => appStore.state.activeProfileId);
const activeProject = computed(() => appStore.state.activeProject);

const router = useRouter();

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function bootstrap() {
  try {
    await appStore.bootstrap();
  } catch (err) {
    error.value = toError(err);
  }
}

async function saveProject() {
  if (!title.value.trim()) {
    error.value = t("talk.title_required");
    return;
  }
  isSaving.value = true;
  error.value = null;
  try {
    await appStore.createProject({
      title: title.value.trim(),
      audience: audience.value.trim() || null,
      goal: goal.value.trim() || null,
      duration_target_sec: duration.value ? Number(duration.value) * 60 : null,
    });
    await router.push("/");
  } catch (err) {
    error.value = toError(err);
  } finally {
    isSaving.value = false;
  }
}

onMounted(bootstrap);
</script>

<template>
  <section class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-2xl font-semibold">{{ t("talk.title") }}</h1>
      <p class="text-sm text-slate-400">{{ t("talk.subtitle") }}</p>
    </div>

    <div v-if="!activeProfileId" class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p class="text-sm text-slate-300">{{ t("talk.need_profile") }}</p>
      <RouterLink class="text-xs text-emerald-300 underline underline-offset-4" to="/profiles">
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </div>

    <div v-else class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div v-if="activeProject" class="mb-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <div class="text-xs uppercase tracking-[0.2em] text-slate-500">
          {{ t("talk.active_title") }}
        </div>
        <div class="text-sm text-slate-100">{{ activeProject.title }}</div>
      </div>

      <div class="space-y-3">
        <input
          v-model="title"
          class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          type="text"
          :placeholder="t('talk.title_placeholder')"
        />
        <input
          v-model="audience"
          class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          type="text"
          :placeholder="t('talk.audience_placeholder')"
        />
        <input
          v-model="goal"
          class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          type="text"
          :placeholder="t('talk.goal_placeholder')"
        />
        <input
          v-model="duration"
          class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          type="number"
          min="1"
          :placeholder="t('talk.duration_placeholder')"
        />
      </div>

      <div class="mt-4 flex items-center gap-3">
        <button
          class="cursor-pointer rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          type="button"
          :disabled="isSaving"
          @click="saveProject"
        >
          {{ t("talk.save") }}
        </button>
        <RouterLink class="text-xs text-slate-400 underline underline-offset-4" to="/">
          {{ t("talk.back") }}
        </RouterLink>
      </div>

      <p v-if="error" class="mt-2 text-xs text-rose-300">{{ error }}</p>
    </div>
  </section>
</template>
