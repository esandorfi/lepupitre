import { reactive } from "vue";
import {
  hydratePreference,
  writePreference,
} from "@/lib/preferencesStorage";
import { voiceMemoDelete } from "@/domains/voice-recorder/api";

export type VoiceMemo = {
  id: string;
  name: string;
  path: string;
  durationMs: number;
  bytes: number;
  createdAt: string;
  waveformPeaks: number[];
};

const PREFERENCE_KEY = "voice_memos";
const SCOPE = { scope: "profile" as const };

function persist(memos: VoiceMemo[]) {
  writePreference(PREFERENCE_KEY, JSON.stringify(memos), SCOPE);
}

function sortNewestFirst(memos: VoiceMemo[]): VoiceMemo[] {
  return memos.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type VoiceMemoStore = ReturnType<typeof createVoiceMemoStore>;

export function createVoiceMemoStore() {
  const state = reactive({
    memos: [] as VoiceMemo[],
    loaded: false,
  });

  async function load() {
    const raw = await hydratePreference(PREFERENCE_KEY, SCOPE);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as VoiceMemo[];
        state.memos = sortNewestFirst(parsed);
      } catch {
        state.memos = [];
      }
    }
    state.loaded = true;
  }

  function addMemo(memo: VoiceMemo) {
    state.memos = sortNewestFirst([memo, ...state.memos]);
    persist(state.memos);
  }

  async function removeMemo(id: string) {
    const memo = state.memos.find((m) => m.id === id);
    if (memo) {
      try {
        await voiceMemoDelete(memo.path);
      } catch {
        // file may already be deleted
      }
    }
    state.memos = state.memos.filter((m) => m.id !== id);
    persist(state.memos);
  }

  function renameMemo(id: string, name: string) {
    const memo = state.memos.find((m) => m.id === id);
    if (memo) {
      memo.name = name;
      persist(state.memos);
    }
  }

  return {
    state,
    load,
    addMemo,
    removeMemo,
    renameMemo,
  };
}
