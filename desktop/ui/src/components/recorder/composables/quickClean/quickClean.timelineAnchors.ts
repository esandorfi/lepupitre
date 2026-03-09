import type {
  CleanAnchor,
  LineAnchor,
  RawTimelineChunk,
} from "@/components/recorder/composables/quickClean/quickClean.types";

/**
 * Implements compact preview behavior.
 */
export function compactPreview(value: string, max = 120): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max).trimEnd()}...`;
}

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function tokenOverlapScore(left: string, right: string): number {
  const leftTokens = normalizeTokens(left);
  const rightTokens = new Set(normalizeTokens(right));
  if (leftTokens.length === 0 || rightTokens.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap / leftTokens.length;
}

function resolveChunkForLine(
  line: string,
  lineIndex: number,
  totalLines: number,
  chunks: RawTimelineChunk[]
): RawTimelineChunk {
  const fallbackIndex = Math.min(
    chunks.length - 1,
    Math.floor((lineIndex * chunks.length) / Math.max(totalLines, 1))
  );
  let bestIndex = fallbackIndex;
  let bestScore = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const score = tokenOverlapScore(line, chunks[chunkIndex]?.text ?? "");
    if (score > bestScore) {
      bestScore = score;
      bestIndex = chunkIndex;
    }
  }

  return chunks[bestIndex] ?? chunks[fallbackIndex]!;
}

/**
 * Builds the build clean text line anchors derived model.
 */
export function buildCleanTextLineAnchors(options: {
  transcriptText: string;
  hasTranscript: boolean;
  chunks: RawTimelineChunk[];
}): LineAnchor[] {
  const { transcriptText, hasTranscript, chunks } = options;
  const lines = transcriptText.split("\n");
  if (!hasTranscript || lines.length === 0 || chunks.length === 0) {
    return [];
  }

  return lines.map((line, lineIndex) => {
    const normalized = line.trim();
    if (!normalized) {
      return null;
    }
    const chunk = resolveChunkForLine(normalized, lineIndex, lines.length, chunks);
    return { line: normalized, startMs: chunk.startMs, endMs: chunk.endMs };
  });
}

/**
 * Builds the build clean text anchors derived model.
 */
export function buildCleanTextAnchors(options: {
  transcriptText: string;
  hasTranscript: boolean;
  chunks: RawTimelineChunk[];
}): CleanAnchor[] {
  const { transcriptText, hasTranscript, chunks } = options;
  const lines = transcriptText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (!hasTranscript || lines.length === 0 || chunks.length === 0) {
    return [];
  }

  return lines.map((line, index) => {
    const chunk = resolveChunkForLine(line, index, lines.length, chunks);
    return { line, startMs: chunk.startMs, endMs: chunk.endMs };
  });
}
