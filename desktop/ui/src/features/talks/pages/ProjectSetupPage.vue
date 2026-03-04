<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { appStore } from "@/stores/app";

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
    <p class="app-muted text-sm font-semibold">{{ t("talk.subtitle") }}</p>

    <UCard v-if="!activeProfileId" class="app-panel app-panel-compact" variant="outline">
      <p class="app-text text-sm">{{ t("talk.need_profile") }}</p>
      <RouterLink class="app-link text-xs underline underline-offset-4" to="/profiles">
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </UCard>

    <UCard v-else class="app-panel app-panel-compact" variant="outline">
      <UCard v-if="activeProject" as="div" class="app-panel app-panel-compact mb-4" variant="outline">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("talk.active_title") }}
        </div>
        <div class="app-text text-sm">{{ activeProject.title }}</div>
      </UCard>

      <div class="space-y-3">
        <UInput
          v-model="title"
          class="w-full"
          :placeholder="t('talk.title_placeholder')"
        />
        <UInput
          v-model="audience"
          class="w-full"
          :placeholder="t('talk.audience_placeholder')"
        />
        <UInput
          v-model="goal"
          class="w-full"
          :placeholder="t('talk.goal_placeholder')"
        />
        <UInput
          v-model="duration"
          class="w-full"
          type="number"
          min="1"
          :placeholder="t('talk.duration_placeholder')"
        />
      </div>

      <div class="mt-4 flex items-center gap-3">
        <UButton
          size="md"
         
          :disabled="isSaving"
          color="primary"
         @click="saveProject">
          {{ t("talk.save") }}
        </UButton>
        <RouterLink class="app-muted text-xs underline underline-offset-4" to="/">
          {{ t("talk.back") }}
        </RouterLink>
      </div>

      <p v-if="error" class="app-danger-text mt-2 text-xs">{{ error }}</p>
    </UCard>
  </section>
</template>

