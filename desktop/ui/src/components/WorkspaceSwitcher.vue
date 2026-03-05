<script setup lang="ts">
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import { useWorkspaceSwitcher } from "@/components/workspace/useWorkspaceSwitcher";

const {
  t,
  open,
  search,
  error,
  switchingId,
  createOpen,
  createName,
  isCreating,
  editingId,
  renameValue,
  isRenaming,
  deletingId,
  deleteTarget,
  triggerRef,
  searchInputRef,
  createInputRef,
  renameInputRef,
  PANEL_POPOVER_CONTENT,
  PANEL_POPOVER_UI,
  activeProfileId,
  recentProfiles,
  showSearch,
  showRecentSection,
  mainProfiles,
  hasNoProfiles,
  hasNoSearchResults,
  currentLabel,
  deleteDialogTitle,
  deleteDialogBody,
  currentToolbarColorStyle,
  closePanel,
  onPopoverOpenChange,
  toggleCreate,
  createProfileInline,
  selectProfile,
  confirmRename,
  onPanelMouseDownCapture,
  onRenameEditorFocusOut,
  rowMenuItems,
  cancelDelete,
  confirmDelete,
  onProfileRowActivate,
  rowMenuButtonAriaLabel,
  workspaceMetaLabel,
  toolbarColorPreviewStyle,
  activeRowStyle,
} = useWorkspaceSwitcher();
</script>
<template>
  <div class="relative">
    <UPopover
      :open="open"
      :portal="false"
      :content="PANEL_POPOVER_CONTENT"
      :ui="PANEL_POPOVER_UI"
      @update:open="onPopoverOpenChange"
    >
      <template #default="{ open: menuOpen }">
        <UButton
          ref="triggerRef"
         
          size="md"
          class="app-toolbar-button flex max-w-[260px] items-center gap-2 border px-3 text-left app-text-meta transition"
          aria-haspopup="menu"
          :aria-expanded="menuOpen ? 'true' : 'false'"
          :aria-label="t('shell.workspaces_toggle')"
         color="neutral" variant="outline">
          <span class="inline-flex h-3 w-3 shrink-0 rounded-full border app-border" :style="currentToolbarColorStyle"></span>
          <span class="min-w-0 flex-1 truncate font-semibold">{{ currentLabel }}</span>
          <svg
            class="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </UButton>
      </template>

      <template #content>
        <div @pointerdown.capture="onPanelMouseDownCapture">
      <div class="mb-2 flex items-center justify-between gap-2">
        <h2 class="app-text text-sm font-semibold">{{ t("shell.workspaces_switch_title") }}</h2>
        <UButton
         
         
          class="border app-border"
          :aria-label="t('shell.close')"
          color="neutral"
         variant="outline" size="md" square="true" @click="closePanel">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m18 6-12 12M6 6l12 12" />
          </svg>
        </UButton>
      </div>
      <UInput
        v-if="showSearch"
        ref="searchInputRef"
        v-model="search"
        type="text"
        size="md"
        class="mb-3 w-full app-text-body"
        :placeholder="t('shell.workspaces_search')"
      />

      <div v-if="!hasNoProfiles && !hasNoSearchResults" class="max-h-72 space-y-3 overflow-y-auto overflow-x-visible pr-1">
        <div v-if="showRecentSection" class="space-y-1">
          <p class="app-text-eyebrow px-2">
            {{ t("shell.workspaces_recent") }}
          </p>
          <UButton
            v-for="profile in recentProfiles"
            :key="`recent-${profile.id}`"
           
            size="sm"
            class="app-switcher-row w-full justify-start gap-3 rounded-xl px-3 py-2 text-left"
            :disabled="switchingId === profile.id"
            color="neutral"
           variant="ghost" @click="selectProfile(profile.id)">
            <span class="min-w-0 flex-1">
              <span class="app-text block truncate text-sm font-semibold">{{ profile.name }}</span>
              <span class="app-muted block text-xs">{{ workspaceMetaLabel(profile) }}</span>
            </span>
            <span v-if="switchingId === profile.id" class="app-muted shrink-0 text-xs">…</span>
          </UButton>
        </div>

        <div class="space-y-1">
          <p v-if="showRecentSection" class="app-text-eyebrow px-2">
            {{ t("shell.workspaces_all") }}
          </p>
          <div v-for="profile in mainProfiles" :key="profile.id" class="space-y-1">
            <div class="flex items-center gap-1">
            <div
              v-if="editingId === profile.id"
              class="flex min-w-0 flex-1 items-center"
              @focusout="onRenameEditorFocusOut(profile.id, $event)"
            >
              <UInput
                ref="renameInputRef"
                v-model="renameValue"
                size="sm"
                class="h-9 min-w-0 w-full flex-1 text-sm"
                type="text"
                :disabled="isRenaming"
                @keyup.enter="confirmRename(profile.id)"
              />
            </div>

            <UButton
              v-else
             
              size="sm"
              class="app-switcher-row group min-w-0 flex-1 justify-start gap-3 rounded-xl px-3 py-2 text-left"
              :class="profile.id === activeProfileId ? 'app-switcher-row-active' : ''"
              :disabled="switchingId === profile.id || deletingId === profile.id"
              :title="profile.id === activeProfileId ? t('shell.workspaces_color_cycle') : undefined"
              :style="activeRowStyle(profile.id)"
              color="neutral"
             variant="ghost" @click="onProfileRowActivate(profile.id)">
              <span class="min-w-0 flex-1">
                <span class="app-switcher-row-title block truncate text-sm font-semibold">{{ profile.name }}</span>
                <span class="app-switcher-row-meta block text-xs">{{ workspaceMetaLabel(profile) }}</span>
              </span>
              <span
                v-if="profile.id === activeProfileId"
                class="app-switcher-row-color-indicator shrink-0 rounded-full border transition duration-150 group-hover:scale-110"
                :style="toolbarColorPreviewStyle(profile.id)"
                aria-hidden="true"
              ></span>
              <svg
                v-if="profile.id === activeProfileId"
                class="app-switcher-row-check h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span v-else-if="switchingId === profile.id" class="app-muted shrink-0 text-xs">…</span>
            </UButton>

            <div v-if="editingId !== profile.id" class="flex shrink-0 items-center gap-1">
              <div class="relative">
                <UDropdownMenu
                  :items="rowMenuItems(profile)"
                  :content="{ align: 'end', side: 'left', sideOffset: 6 }"
                  :portal="false"
                >
                  <template #default="{ open: menuOpen }">
                    <UButton
                     
                     
                      class="border app-border"
                      :aria-label="rowMenuButtonAriaLabel(profile.name)"
                      :aria-expanded="menuOpen ? 'true' : 'false'"
                      aria-haspopup="menu"
                      :disabled="deletingId === profile.id || isRenaming"
                     color="neutral" variant="outline" size="md" square="true">
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                      </svg>
                    </UButton>
                  </template>
                </UDropdownMenu>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
      <p v-else-if="hasNoProfiles" class="app-muted py-2 text-sm">{{ t("shell.workspaces_empty") }}</p>
      <p v-else class="app-muted py-2 text-sm">{{ t("shell.workspaces_empty_search") }}</p>

      <p v-if="error" class="app-danger-text mt-2 text-xs">{{ error }}</p>

      <USeparator class="my-3" />
      <div class="grid gap-2">
        <UButton
         
          size="md"
          class="w-full justify-start text-left app-text-body font-semibold"
          color="neutral"
         variant="outline" @click="toggleCreate">
          + {{ t("shell.workspaces_new") }}
        </UButton>
        <UCard v-if="createOpen" as="div" class="app-panel app-panel-compact rounded-xl p-2" variant="outline">
          <UInput
            ref="createInputRef"
            v-model="createName"
            type="text"
            size="md"
            class="h-10 w-full text-sm"
            :placeholder="t('profiles.create_placeholder')"
            :disabled="isCreating"
            @keyup.enter="createProfileInline"
            @keyup.escape="toggleCreate"
          />
          <div class="mt-2 flex justify-end gap-2">
            <UButton
             
              size="sm"
              :disabled="isCreating"
              color="neutral"
             variant="outline" @click="toggleCreate">
              {{ t("profiles.cancel") }}
            </UButton>
            <UButton
             
              size="sm"
              :disabled="isCreating"
              color="primary"
             @click="createProfileInline">
              {{ t("profiles.create_action") }}
            </UButton>
          </div>
        </UCard>
      </div>
        </div>
      </template>
    </UPopover>
    <ConfirmDialog
      :open="deleteTarget !== null"
      :title="deleteDialogTitle"
      :body="deleteDialogBody"
      :confirm-label="t('profiles.confirm_delete_action')"
      :cancel-label="t('profiles.cancel')"
      confirm-variant="danger"
      :busy="Boolean(deleteTarget && deletingId === deleteTarget.id)"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    />
  </div>
</template>

