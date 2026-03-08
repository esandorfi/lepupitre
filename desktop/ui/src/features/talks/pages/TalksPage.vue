<script setup lang="ts">
import { RouterLink } from "vue-router";
import PageHeader from "@/components/PageHeader.vue";
import PageShell from "@/components/PageShell.vue";
import SectionPanel from "@/components/SectionPanel.vue";
import TalksBlueprintPanel from "@/features/talks/components/TalksBlueprintPanel.vue";
import TalksMascotPanel from "@/features/talks/components/TalksMascotPanel.vue";
import TalksProjectsPanel from "@/features/talks/components/TalksProjectsPanel.vue";
import { useTalksPageState } from "@/features/talks/composables/talksPage/useTalksPageState";

const vm = useTalksPageState();
</script>

<template>
  <PageShell>
    <PageHeader
      :eyebrow="vm.t('talks.title')"
      :title="vm.t('talks.title')"
      :subtitle="vm.t('talks.subtitle')"
    >
      <template #actions>
        <UButton size="md" to="/project/new" color="primary">
          {{ vm.t("talks.create") }}
        </UButton>
      </template>
    </PageHeader>

    <TalksMascotPanel
      :show="vm.view.showMascotCard"
      :message="vm.data.mascotMessage"
      :body="vm.view.mascotBody"
    />

    <TalksBlueprintPanel
      :has-active-profile="vm.view.hasActiveProfile"
      :has-active-project="vm.view.hasActiveProject"
      :is-loading="vm.data.isBlueprintLoading"
      :blueprint="vm.data.talksBlueprint"
    />

    <SectionPanel v-if="!vm.view.hasActiveProfile" variant="compact">
      <p class="app-text app-text-body">{{ vm.t("talk.need_profile") }}</p>
      <RouterLink class="app-link app-text-meta mt-2 inline-block underline underline-offset-4" to="/profiles">
        {{ vm.t("talk.goto_profiles") }}
      </RouterLink>
    </SectionPanel>

    <TalksProjectsPanel
      v-else
      :is-loading="vm.data.isLoading"
      :error="vm.data.error"
      :has-active-profile="vm.view.hasActiveProfile"
      :projects="vm.view.projects"
      :switching-project-id="vm.data.isSwitching"
      :on-go-to-define="vm.actions.goToDefine"
      :on-set-active="vm.actions.setActive"
    />
  </PageShell>
</template>
