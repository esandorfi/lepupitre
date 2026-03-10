import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { ProfileSummary } from "@/schemas/ipc";
import { createProfilesViewModel } from "@/features/workspace/composables/profilesViewModel";

function profile(id: string, name: string): ProfileSummary {
  return {
    id,
    name,
    created_at: "2026-03-01T10:00:00Z",
    is_active: false,
    talks_count: 0,
    size_bytes: 0,
    last_opened_at: null,
  };
}

describe("profilesViewModel", () => {
  it("derives delete dialog copy from the current target", () => {
    const view = createProfilesViewModel({
      t: (key: string) => key,
      deleteTarget: ref(profile("p1", "Alpha")),
      isRenaming: ref(false),
      deletingId: ref<string | null>(null),
      startRename: vi.fn(),
      requestDelete: vi.fn(),
    });

    expect(view.deleteDialogTitle.value).toBe('profiles.delete_title_prefix "Alpha" ?');
    expect(view.deleteDialogBody.value).toBe(
      'profiles.delete_body_prefix "Alpha" profiles.delete_body_suffix'
    );
  });

  it("builds row menu items from command callbacks and ui flags", () => {
    const startRename = vi.fn();
    const requestDelete = vi.fn();
    const view = createProfilesViewModel({
      t: (key: string) => key,
      deleteTarget: ref<ProfileSummary | null>(null),
      isRenaming: ref(true),
      deletingId: ref<string | null>("p1"),
      startRename,
      requestDelete,
    });
    const target = profile("p1", "Alpha");
    const items = view.profileMenuItems(target);

    expect(items[0]?.disabled).toBe(true);
    expect(items[1]?.disabled).toBe(true);

    items[0]?.onSelect?.();
    items[1]?.onSelect?.();

    expect(startRename).toHaveBeenCalledWith("p1", "Alpha");
    expect(requestDelete).toHaveBeenCalledWith(target);
  });
});
