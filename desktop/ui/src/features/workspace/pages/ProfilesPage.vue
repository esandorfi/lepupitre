<script setup lang="ts">
import { reactive } from "vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import { useI18n } from "@/lib/i18n";
import { useProfilesPageState } from "@/features/workspace/composables/useProfilesPageState";

/**
 * Page composition root (profiles management).
 * Reads: profiles and editing state from `useProfilesPageState`.
 * Actions: create/switch/rename/delete profile commands delegated to runtime actions.
 * Boundary: page handles composition and local i18n labels.
 */
const { t } = useI18n();
const vm = reactive(useProfilesPageState());
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 class="app-text text-2xl font-semibold tracking-tight">{{ t("profiles.title") }}</h1>
        <p class="app-muted mt-1 text-sm">{{ t("profiles.subtitle") }}</p>
      </div>
      <UButton size="lg" color="primary" @click="vm.focusCreateForm">
        {{ t("profiles.create_action") }}
      </UButton>
    </header>

    <UCard
      v-if="vm.profiles.length === 0"
      as="div"
      class="app-panel app-panel-compact rounded-2xl px-5 py-8 text-center"
      variant="outline"
    >
      <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full app-avatar text-sm font-bold">
        WS
      </div>
      <h2 class="app-text text-lg font-semibold">{{ t("profiles.empty_title") }}</h2>
      <p class="app-muted mx-auto mt-2 max-w-xl text-sm">{{ t("profiles.empty_body") }}</p>
      <UButton class="mt-4" size="lg" color="primary" @click="vm.focusCreateForm">
        {{ t("profiles.create_action") }}
      </UButton>
    </UCard>

    <UCard v-else as="section" class="app-panel app-panel-compact" variant="outline">
      <div class="flex items-center justify-between gap-3">
        <h2 class="app-subtle text-xs font-semibold uppercase tracking-[0.2em]">
          {{ t("profiles.existing_title") }}
        </h2>
      </div>

      <div class="mt-4 space-y-2">
        <UCard
          v-for="profile in vm.profiles"
          :key="profile.id"
          as="div"
          class="app-panel app-panel-compact flex flex-col gap-3 rounded-xl px-3 py-3 md:flex-row md:items-center md:justify-between"
          variant="outline"
        >
          <div class="flex min-w-0 items-start gap-3">
            <div class="app-avatar mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {{ vm.initialsFor(profile.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <div v-if="vm.editingId !== profile.id" class="app-text truncate text-sm font-semibold">
                {{ profile.name }}
              </div>
              <div v-else class="flex flex-wrap gap-2">
                <UInput
                  :id="`rename-${profile.id}`"
                  :ref="vm.setRenameInput(profile.id)"
                  v-model="vm.renameValue"
                  :disabled="vm.isRenaming"
                  :aria-label="t('profiles.rename')"
                  class="min-w-[240px] flex-1 app-text-body"
                  size="md"
                  type="text"
                  @blur="vm.confirmRename(profile.id)"
                  @keyup.enter="vm.confirmRename(profile.id)"
                  @keyup.escape="vm.cancelRename"
                />
              </div>
              <div class="app-muted mt-1 text-xs">{{ vm.formatProfileMeta(profile) }}</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              v-if="profile.id !== vm.activeProfileId"
              size="lg"
              color="neutral"
              variant="outline"
              @click="vm.switchProfile(profile.id)"
            >
              {{ t("profiles.switch") }}
            </UButton>
            <UBadge v-else size="md" color="primary" variant="solid">
              {{ t("profiles.active") }}
            </UBadge>

            <UDropdownMenu
              :items="vm.profileMenuItems(profile)"
              :content="{ align: 'end', side: 'bottom', sideOffset: 6 }"
              :portal="false"
            >
              <template #default="{ open: menuOpen }">
                <UButton
                  :aria-label="`${t('profiles.row_actions')}: ${profile.name}`"
                  :aria-expanded="menuOpen ? 'true' : 'false'"
                  aria-haspopup="menu"
                  :disabled="vm.isRenaming || vm.deletingId === profile.id"
                  color="neutral"
                  variant="outline"
                  size="xl"
                  square="true"
                >
                  <svg
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </UButton>
              </template>
            </UDropdownMenu>
          </div>
        </UCard>
      </div>

      <p v-if="vm.error" class="app-danger-text mt-3 text-xs">{{ vm.error }}</p>
    </UCard>

    <UCard as="section" class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
      <div ref="vm.createSection">
        <h2 class="app-subtle text-xs font-semibold uppercase tracking-[0.2em]">
          {{ t("profiles.add_title") }}
        </h2>
        <div class="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <UFormField
            :label="t('profiles.create_placeholder')"
            :help="t('profiles.create_helper')"
            class="app-text text-sm"
          >
            <UInput
              id="workspace-name-input"
              ref="vm.createInput"
              v-model="vm.name"
              type="text"
              class="w-full app-text-body"
              size="md"
              :placeholder="t('profiles.create_placeholder')"
              @keyup.enter="vm.createProfile"
              @keyup.escape="vm.name = ''"
            />
          </UFormField>
          <UButton
            size="lg"
            :disabled="vm.isSaving"
            color="primary"
            @click="vm.createProfile"
          >
            {{ t("profiles.create_action") }}
          </UButton>
        </div>
      </div>
      <p v-if="vm.error" class="app-danger-text mt-3 text-xs">{{ vm.error }}</p>
    </UCard>

    <ConfirmDialog
      :open="vm.deleteTarget !== null"
      :title="vm.deleteDialogTitle"
      :body="vm.deleteDialogBody"
      :confirm-label="t('profiles.confirm_delete_action')"
      :cancel-label="t('profiles.cancel')"
      confirm-variant="danger"
      :busy="Boolean(vm.deleteTarget && vm.deletingId === vm.deleteTarget.id)"
      @cancel="vm.cancelDelete"
      @confirm="vm.confirmDelete"
    />
  </section>
</template>
