import { HELP_CONTENT_FILES } from "../content/help";
import { renderMarkdown } from "./markdown";

export const HELP_AUDIENCES = ["first", "manager", "conference"] as const;

export type HelpAudience = (typeof HELP_AUDIENCES)[number];

export type HelpContentEntry = {
  id: string;
  title: string;
  audiences: HelpAudience[];
  appliesToRoutes: string[];
  version: number;
  body: string;
  html: string;
  sourcePath: string;
};

export const ONBOARDING_TRACK_BY_AUDIENCE: Record<HelpAudience, string> = {
  first: "onboarding.first-time-speaker",
  manager: "onboarding.engineering-manager",
  conference: "onboarding.conference-speaker",
};

function parseScalar(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2) {
    const quote = value[0];
    if ((quote === "'" || quote === "\"") && value[value.length - 1] === quote) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function parseArray(raw: string): string[] {
  const value = raw.trim();
  if (!value.startsWith("[") || !value.endsWith("]")) {
    throw new Error(`Expected [a, b] array format, got "${raw}"`);
  }
  const body = value.slice(1, -1).trim();
  if (!body) {
    return [];
  }
  return body
    .split(",")
    .map((item) => parseScalar(item))
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFrontmatterBlock(rawContent: string, sourcePath: string) {
  const normalized = rawContent.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`Missing or invalid frontmatter in ${sourcePath}`);
  }

  const [, frontmatterBlock, bodyBlock] = match;
  const frontmatter = new Map<string, string>();
  for (const rawLine of frontmatterBlock.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      throw new Error(`Invalid frontmatter line "${line}" in ${sourcePath}`);
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    frontmatter.set(key, value);
  }

  return { frontmatter, body: bodyBlock.trim() };
}

function parseHelpEntry(rawContent: string, sourcePath: string): HelpContentEntry {
  const { frontmatter, body } = parseFrontmatterBlock(rawContent, sourcePath);

  const idRaw = frontmatter.get("id");
  const titleRaw = frontmatter.get("title");
  const audiencesRaw = frontmatter.get("audiences");
  const versionRaw = frontmatter.get("version");
  const appliesRaw = frontmatter.get("applies_to_routes");

  if (!idRaw || !titleRaw || !audiencesRaw || !versionRaw) {
    throw new Error(
      `Missing required frontmatter keys (id/title/audiences/version) in ${sourcePath}`
    );
  }

  const audiences = parseArray(audiencesRaw);
  if (audiences.length === 0) {
    throw new Error(`audiences must contain at least one value in ${sourcePath}`);
  }

  const normalizedAudiences = audiences.map((audience) => {
    if (!HELP_AUDIENCES.includes(audience as HelpAudience)) {
      throw new Error(`Unsupported audience "${audience}" in ${sourcePath}`);
    }
    return audience as HelpAudience;
  });

  const version = Number.parseInt(parseScalar(versionRaw), 10);
  if (!Number.isFinite(version) || version <= 0) {
    throw new Error(`Invalid version "${versionRaw}" in ${sourcePath}`);
  }

  return {
    id: parseScalar(idRaw),
    title: parseScalar(titleRaw),
    audiences: normalizedAudiences,
    appliesToRoutes: appliesRaw ? parseArray(appliesRaw) : [],
    version,
    body,
    html: renderMarkdown(body),
    sourcePath,
  };
}

function loadHelpContentEntries(): HelpContentEntry[] {
  const entries = HELP_CONTENT_FILES.map(({ path, raw }) => parseHelpEntry(raw, path));
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate help content id "${entry.id}"`);
    }
    ids.add(entry.id);
  }
  return entries;
}

const HELP_CONTENT_ENTRIES = loadHelpContentEntries();
const HELP_CONTENT_BY_ID = new Map(HELP_CONTENT_ENTRIES.map((entry) => [entry.id, entry]));

export function listHelpContentEntries(): HelpContentEntry[] {
  return HELP_CONTENT_ENTRIES;
}

export function listHelpContentByAudience(audience: HelpAudience | null): HelpContentEntry[] {
  if (!audience) {
    return HELP_CONTENT_ENTRIES;
  }
  return HELP_CONTENT_ENTRIES.filter((entry) => entry.audiences.includes(audience));
}

export function getHelpContentById(id: string | null | undefined): HelpContentEntry | null {
  if (!id) {
    return null;
  }
  return HELP_CONTENT_BY_ID.get(id) ?? null;
}

export function getOnboardingTrackByAudience(audience: HelpAudience): HelpContentEntry | null {
  return getHelpContentById(ONBOARDING_TRACK_BY_AUDIENCE[audience]);
}

export function parseHelpAudience(value: unknown): HelpAudience | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") {
    return null;
  }
  return HELP_AUDIENCES.includes(candidate as HelpAudience) ? (candidate as HelpAudience) : null;
}

export function parseHelpTopic(value: unknown): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") {
    return null;
  }
  const trimmed = candidate.trim();
  return trimmed ? trimmed : null;
}

export function toHelpTopicElementId(topicId: string): string {
  return `help-topic-${topicId.replace(/[^a-z0-9_-]/gi, "-")}`;
}
