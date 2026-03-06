import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";

export function autoCleanFillers(deps: AudioRecorderRuntimeDeps) {
  const next = deps.transcriptDraftText.value
    .replace(
      /\b(uh|um|erm|eh|ah|oh|like|you know|i mean|sort of|kind of|basically|actually|literally)\b/gi,
      ""
    )
    .replace(
      /\b(euh|heu|hein|ben|bah|beh|bon ben|enfin|genre|voila|quoi|du coup|en fait|tu vois|tu sais|c'est-a-dire|disons)\b/gi,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  deps.transcriptDraftText.value = next;
}

export function fixPunctuation(deps: AudioRecorderRuntimeDeps) {
  let next = deps.transcriptDraftText.value
    .replace(/\s+([,.;!?:])/g, "$1")
    .replace(/([,.;!?:])([^\s\n\d])/g, "$1 $2")
    .replace(
      /([.!?])\s+([a-zA-Z\u00C0-\u00FF])/g,
      (_match: string, punct: string, letter: string) => `${punct} ${letter.toUpperCase()}`
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (next.length > 0) {
    next = next[0].toUpperCase() + next.slice(1);
  }
  deps.transcriptDraftText.value = next;
}
