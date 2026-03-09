<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import PageHeader from "@/components/PageHeader.vue";
import PageShell from "@/components/PageShell.vue";
import SectionPanel from "@/components/SectionPanel.vue";
import TalksBlueprintPanel from "@/features/talks/components/TalksBlueprintPanel.vue";
import TalksMascotPanel from "@/features/talks/components/TalksMascotPanel.vue";
import TalksProjectsPanel from "@/features/talks/components/TalksProjectsPanel.vue";
import { useTalksPageState } from "@/features/talks/composables/talksPage/useTalksPageState";

/**
 * Page composition root (talks hub).
 * Reads: `vm.view` + `vm.data` + `vm.guard` from `useTalksPageState` and local i18n labels.
 * Actions: `vm.actions.setActive`, `vm.actions.goToDefine`.
 * Boundary: this page renders and wires events; runtime/store side effects stay in composables.
 */
const { t } = useI18n();
const vm = useTalksPageState();
</script>

<template>
  <PageShell>
    <PageHeader
      :eyebrow="t('talks.title')"
      :title="t('talks.title')"
      :subtitle="t('talks.subtitle')"
    >
      <template #actions>
        <UButton to="/project/new" color="primary">
          {{ t("talks.create") }}
        </UButton>
      </template>
    </PageHeader>

    <TalksMascotPanel
      :show="vm.view.showMascotCard"
      :message="vm.data.mascotMessage"
      :body="vm.view.mascotBody"
    />

    <TalksBlueprintPanel
      v-if="vm.guard.canShowBlueprint"
      :is-loading="vm.data.isBlueprintLoading"
      :blueprint="vm.data.talksBlueprint"
    />

    <SectionPanel v-if="vm.guard.shouldShowProfilePrompt" variant="compact">
      <p class="app-text app-text-body">{{ t("talk.need_profile") }}</p>
      <RouterLink class="app-link-meta mt-2 inline-block underline underline-offset-4" to="/profiles">
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </SectionPanel>

    <TalksProjectsPanel
      v-if="vm.guard.canShowProjects"
      :is-loading="vm.data.isLoading"
      :error="vm.data.error"
      :projects="vm.view.projects"
      :switching-project-id="vm.data.isSwitching"
      :on-go-to-define="vm.actions.goToDefine"
      :on-set-active="vm.actions.setActive"
    />
  </PageShell>
</template>
