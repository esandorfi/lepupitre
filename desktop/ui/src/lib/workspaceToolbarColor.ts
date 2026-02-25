import type { Theme } from "./theme";

export type WorkspaceToolbarColorKey = "default" | "amber" | "sky" | "mint" | "rose";

type ToolbarColorVars = {
  bg: string;
  start: string;
  end: string;
  text: string;
  muted: string;
  border: string;
  buttonBg: string;
  buttonHover: string;
};

type ToolbarPaletteEntry = {
  previewStart: string;
  previewEnd: string;
  themes: Record<Theme, ToolbarColorVars>;
};

const STORAGE_KEY = "lepupitre_workspace_toolbar_colors_v1";
const ORDER: WorkspaceToolbarColorKey[] = ["default", "amber", "sky", "mint", "rose"];
const CSS_VAR_NAMES = [
  "--workspace-toolbar-bg",
  "--workspace-toolbar-bg-start",
  "--workspace-toolbar-bg-end",
  "--workspace-toolbar-text",
  "--workspace-toolbar-text-muted",
  "--workspace-toolbar-border",
  "--workspace-toolbar-button-bg",
  "--workspace-toolbar-button-hover",
] as const;

const PALETTE: Record<Exclude<WorkspaceToolbarColorKey, "default">, ToolbarPaletteEntry> = {
  amber: {
    previewStart: "#8b5cf6",
    previewEnd: "#c4b5fd",
    themes: {
      orange: {
        bg: "#8b5cf6",
        start: "#7c3aed",
        end: "#c4b5fd",
        text: "#140a2a",
        muted: "#2a1859",
        border: "#a78bfa",
        buttonBg: "#f3efff",
        buttonHover: "#e8e0ff",
      },
      terminal: {
        bg: "#23143f",
        start: "#23143f",
        end: "#36206a",
        text: "#f5f3ff",
        muted: "#ddd6fe",
        border: "#6d28d9",
        buttonBg: "#2f1b55",
        buttonHover: "#45247a",
      },
    },
  },
  sky: {
    previewStart: "#3b82f6",
    previewEnd: "#60a5fa",
    themes: {
      orange: {
        bg: "#4f8ff8",
        start: "#3b82f6",
        end: "#7fb4ff",
        text: "#081226",
        muted: "#10203f",
        border: "#6ea8ff",
        buttonBg: "#eaf3ff",
        buttonHover: "#d7e9ff",
      },
      terminal: {
        bg: "#0c203f",
        start: "#0c203f",
        end: "#143264",
        text: "#eff6ff",
        muted: "#bfdbfe",
        border: "#1d4ed8",
        buttonBg: "#13294f",
        buttonHover: "#1a3970",
      },
    },
  },
  mint: {
    previewStart: "#10b981",
    previewEnd: "#34d399",
    themes: {
      orange: {
        bg: "#20b486",
        start: "#109f75",
        end: "#59d9af",
        text: "#041b14",
        muted: "#07352a",
        border: "#37c89d",
        buttonBg: "#e8fff7",
        buttonHover: "#d0faeb",
      },
      terminal: {
        bg: "#07261f",
        start: "#07261f",
        end: "#0b3b31",
        text: "#ecfdf5",
        muted: "#a7f3d0",
        border: "#0f766e",
        buttonBg: "#0d332b",
        buttonHover: "#125247",
      },
    },
  },
  rose: {
    previewStart: "#e11d48",
    previewEnd: "#fb7185",
    themes: {
      orange: {
        bg: "#f05274",
        start: "#e11d48",
        end: "#fb8ea0",
        text: "#2a0812",
        muted: "#45111f",
        border: "#fb7185",
        buttonBg: "#fff0f4",
        buttonHover: "#ffe1e9",
      },
      terminal: {
        bg: "#34101a",
        start: "#34101a",
        end: "#4d1323",
        text: "#fff1f2",
        muted: "#fecdd3",
        border: "#9f1239",
        buttonBg: "#441825",
        buttonHover: "#5f2234",
      },
    },
  },
};

function isColorKey(value: string): value is WorkspaceToolbarColorKey {
  return ORDER.includes(value as WorkspaceToolbarColorKey);
}

function loadMap(): Record<string, WorkspaceToolbarColorKey> {
  if (typeof localStorage === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<string, WorkspaceToolbarColorKey> = {};
    for (const [profileId, value] of Object.entries(parsed)) {
      if (typeof value === "string" && isColorKey(value) && value !== "default") {
        next[profileId] = value;
      }
    }
    return next;
  } catch {
    return {};
  }
}

function saveMap(value: Record<string, WorkspaceToolbarColorKey>) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function setToolbarVars(vars: ToolbarColorVars | null) {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (!vars) {
    for (const name of CSS_VAR_NAMES) {
      root.style.removeProperty(name);
    }
    return;
  }
  root.style.setProperty("--workspace-toolbar-bg", vars.bg);
  root.style.setProperty("--workspace-toolbar-bg-start", vars.start);
  root.style.setProperty("--workspace-toolbar-bg-end", vars.end);
  root.style.setProperty("--workspace-toolbar-text", vars.text);
  root.style.setProperty("--workspace-toolbar-text-muted", vars.muted);
  root.style.setProperty("--workspace-toolbar-border", vars.border);
  root.style.setProperty("--workspace-toolbar-button-bg", vars.buttonBg);
  root.style.setProperty("--workspace-toolbar-button-hover", vars.buttonHover);
}

export function getWorkspaceToolbarColor(profileId: string | null | undefined): WorkspaceToolbarColorKey {
  if (!profileId) {
    return "default";
  }
  const map = loadMap();
  return map[profileId] ?? "default";
}

export function setWorkspaceToolbarColor(profileId: string, key: WorkspaceToolbarColorKey) {
  const map = loadMap();
  if (key === "default") {
    delete map[profileId];
  } else {
    map[profileId] = key;
  }
  saveMap(map);
}

export function cycleWorkspaceToolbarColor(profileId: string): WorkspaceToolbarColorKey {
  const current = getWorkspaceToolbarColor(profileId);
  const currentIndex = ORDER.indexOf(current);
  const next = ORDER[(currentIndex + 1) % ORDER.length];
  setWorkspaceToolbarColor(profileId, next);
  return next;
}

export function applyWorkspaceToolbarColor(profileId: string | null | undefined, theme: Theme) {
  if (!profileId) {
    setToolbarVars(null);
    return;
  }
  const key = getWorkspaceToolbarColor(profileId);
  if (key === "default") {
    setToolbarVars(null);
    return;
  }
  setToolbarVars(PALETTE[key].themes[theme]);
}

export function getWorkspaceToolbarColorPreview(
  key: WorkspaceToolbarColorKey,
  theme: Theme
): { start: string; end: string; border: string; text: string; muted: string } {
  if (key === "default") {
    return theme === "terminal"
      ? {
          start: "#0b1220",
          end: "#0b1220",
          border: "#1f2937",
          text: "#f8fafc",
          muted: "#cbd5f5",
        }
      : {
          start: "#ff8517",
          end: "#ffb867",
          border: "#ffa24c",
          text: "#1a1009",
          muted: "#3a2316",
        };
  }
  const vars = PALETTE[key].themes[theme];
  return {
    start: PALETTE[key].previewStart,
    end: PALETTE[key].previewEnd,
    border: vars.border,
    text: vars.text,
    muted: vars.muted,
  };
}

export function workspaceToolbarColorKeys(): readonly WorkspaceToolbarColorKey[] {
  return ORDER;
}
