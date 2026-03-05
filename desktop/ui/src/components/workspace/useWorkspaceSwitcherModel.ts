import { computed, type Ref } from "vue";
import {
  getWorkspaceToolbarColor,
  getWorkspaceToolbarColorPreview,
} from "@/lib/workspaceToolbarColor";
import type { Theme } from "@/lib/theme";
import { appState } from "@/stores/app";
import type { ProfileSummary } from "@/schemas/ipc";

export type Translate = (key: string) => string;

function profileSortScore(profile: { last_opened_at?: string | null; created_at: string }) {
  const timestamp = Date.parse(profile.last_opened_at || profile.created_at);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function createWorkspaceSwitcherModel(params: {
  search: Ref<string>;
  deleteTarget: Ref<{ id: string; name: string } | null>;
  toolbarColorTick: Ref<number>;
  t: Translate;
  theme: Ref<Theme>;
}) {
  const { search, deleteTarget, toolbarColorTick, t, theme } = params;
  const profiles = computed(() => appState.profiles);
  const activeProfileId = computed(() => appState.activeProfileId);
  const activeProfile = computed(
    () => profiles.value.find((profile) => profile.id === activeProfileId.value) ?? null
  );
  const sortedProfiles = computed(() =>
    [...profiles.value].sort((a, b) => a.name.localeCompare(b.name))
  );
  const showSearch = computed(() => profiles.value.length > 10);
  const isSearching = computed(() => showSearch.value && search.value.trim().length > 0);
  const filteredProfiles = computed(() => {
    if (!showSearch.value) {
      return sortedProfiles.value;
    }
    const needle = search.value.trim().toLowerCase();
    if (!needle) {
      return sortedProfiles.value;
    }
    return sortedProfiles.value.filter((profile) => profile.name.toLowerCase().includes(needle));
  });
  const recentProfiles = computed(() => {
    if (isSearching.value) {
      return [];
    }
    return [...filteredProfiles.value]
      .filter((profile) => profile.id !== activeProfileId.value && Boolean(profile.last_opened_at))
      .sort((a, b) => profileSortScore(b) - profileSortScore(a))
      .slice(0, 3);
  });
  const recentProfileIds = computed(
    () => new Set(recentProfiles.value.map((profile) => profile.id))
  );
  const showRecentSection = computed(
    () => recentProfiles.value.length > 0 && filteredProfiles.value.length > 4
  );
  const mainProfiles = computed(() => {
    if (!showRecentSection.value) {
      return filteredProfiles.value;
    }
    return filteredProfiles.value.filter((profile) => !recentProfileIds.value.has(profile.id));
  });
  const hasNoProfiles = computed(() => profiles.value.length === 0);
  const hasNoSearchResults = computed(
    () => !hasNoProfiles.value && filteredProfiles.value.length === 0
  );
  const currentLabel = computed(() => {
    if (activeProfile.value) {
      return activeProfile.value.name;
    }
    if (appState.isBootstrapping) {
      return t("shell.workspaces_loading");
    }
    return t("shell.workspaces_none");
  });
  const deleteDialogTitle = computed(() => {
    if (!deleteTarget.value) {
      return "";
    }
    return `${t("profiles.delete_title_prefix")} "${deleteTarget.value.name}" ?`;
  });
  const deleteDialogBody = computed(() => {
    if (!deleteTarget.value) {
      return "";
    }
    return `${t("profiles.delete_body_prefix")} "${deleteTarget.value.name}" ${t(
      "profiles.delete_body_suffix"
    )}`;
  });

  function toolbarColorPreviewStyle(profileId: string | null | undefined) {
    void toolbarColorTick.value;
    const key = getWorkspaceToolbarColor(profileId);
    const preview = getWorkspaceToolbarColorPreview(key, theme.value);
    return {
      backgroundImage: `linear-gradient(135deg, ${preview.start}, ${preview.end})`,
      borderColor: preview.border,
    } as const;
  }

  const currentToolbarColorStyle = computed(() =>
    toolbarColorPreviewStyle(activeProfileId.value)
  );

  function activeRowStyle(profileId: string) {
    if (profileId !== activeProfileId.value) {
      return undefined;
    }
    void toolbarColorTick.value;
    const key = getWorkspaceToolbarColor(profileId);
    const preview = getWorkspaceToolbarColorPreview(key, theme.value);
    return {
      backgroundColor: preview.start,
      backgroundImage: `linear-gradient(135deg, ${preview.start}, ${preview.end})`,
      boxShadow: `inset 0 0 0 1px ${preview.border}`,
      "--app-switcher-active-text": preview.text,
      "--app-switcher-active-muted": preview.muted,
    } as Record<string, string>;
  }

  function workspaceMetaLabel(profile: Pick<ProfileSummary, "talks_count" | "size_bytes">) {
    const talksLabel = profile.talks_count === 1 ? "talk" : "talks";
    return `${profile.talks_count} ${talksLabel} - ${Math.round(profile.size_bytes / 1024)} KB`;
  }

  function rowMenuButtonAriaLabel(profileName: string) {
    return `${t("shell.workspaces_more_actions")} ${profileName}`;
  }

  return {
    profiles,
    activeProfileId,
    showSearch,
    recentProfiles,
    showRecentSection,
    mainProfiles,
    hasNoProfiles,
    hasNoSearchResults,
    currentLabel,
    deleteDialogTitle,
    deleteDialogBody,
    currentToolbarColorStyle,
    toolbarColorPreviewStyle,
    activeRowStyle,
    workspaceMetaLabel,
    rowMenuButtonAriaLabel,
  };
}
