# Audio Recorder UI Specification (Current)

## Scope

This document specifies the current Audio Recorder UI behavior as implemented in the desktop app (Vue + Tauri), including layout, functions, states, and action targets.

## Global Wireframe

```text
+--------------------------------------------------------------+
| Title + subtitle                            Pass label       |
+--------------------------------------------------------------+
| Phase indicator: Capture | Quick clean | Analyze/Export     |
+--------------------------------------------------------------+
| Dynamic panel (phase-dependent)                              |
| - Capture panel                                               |
| - Quick clean panel                                           |
| - Analyze/Export panel                                        |
+--------------------------------------------------------------+
| Advanced drawer (collapsible)                                |
| - ASR settings, waveform style, input device, diagnostics    |
+--------------------------------------------------------------+
| Saved audio path (if available)                              |
| Error message + contextual links (/settings, /help)          |
+--------------------------------------------------------------+
```

## Phase Wireframes

```text
CAPTURE
[Primary: Start/Pause/Resume] [Danger: Stop] [REC/PAUSED badge]
[Duration] [Quality badge]
[Live waveform]
[Level meter]
[Live text preview]

QUICK CLEAN
[Progress % + stage when transcribing]
[Saved waveform]
[Inline audio player]
[Trim: start/end sliders + reset + apply]
No transcript: [Transcribe now]
With transcript: [Textarea] [Save edited] [Auto clean] [Fix punctuation]
[Open original] [Continue]

ANALYZE / EXPORT
[Export preset: Presentation] [Podcast] [Voice note]
[Analyze] [More formats] [Back]
If More formats: [.txt] [.json] [.srt] [.vtt]
If exported: [Open export] + path
```

## Supported Functions

1. Recording transport: start, pause, resume, stop.
2. Live monitoring: duration, level, quality hint, waveform, preview text.
3. Post-processing: WAV trim and reveal original file.
4. Transcription: trigger, progress tracking, normalized ASR errors.
5. Transcript editing: save edited transcript and quick cleanup helpers.
6. Analyze: trigger analyze with current active transcript.
7. Export: preset exports, explicit format exports, open exported file.
8. Advanced controls: model/mode/language/spoken punctuation, waveform style, input device, diagnostics.

## UI States

1. Phase state: `capture`, `quick_clean`, `analyze_export`.
2. Transport state: `idle`, `recording`, `paused`.
3. Operational state: requesting, recording, encoding, transcribing, trimming, saving, exporting.
4. Audio quality state: `good_level`, `too_quiet`, `noisy_room`, `too_loud`, `no_signal` (with anti-flicker stabilization).
5. Transcription blocked states: `model_missing`, `sidecar_missing`, `sidecar_incompatible`, timeout.
6. Action availability state: `canTranscribe`, `canTrim`, `canPlayback`, `canAnalyze`, `canExport`.

## Primary Action Target (by phase)

| Phase | Primary action | Product target |
|---|---|---|
| Capture | `Start/Pause/Resume` | Produce a usable audio artifact |
| Quick clean (no transcript) | `Transcribe now` | Produce a usable transcript |
| Quick clean (with transcript) | `Continue` | Move to Analyze/Export |
| Analyze/Export | `Analyze` | Launch analysis on active transcript |

## Secondary Action Targets

| Phase | Secondary actions | Target |
|---|---|---|
| Capture | `Stop` | End recording and move to quick clean |
| Quick clean | `Apply trim`, `Open original` | Refine audio and verify source |
| Quick clean (with transcript) | `Save edited`, `Auto clean`, `Fix punctuation` | Improve transcript quality |
| Analyze/Export | `Export preset/format`, `Open export`, `Back` | Produce outputs or return to editing |

## Keyboard Shortcuts

1. `Space`: capture primary action.
2. `Ctrl/Cmd + Enter`: transcribe (capture), continue (quick clean), analyze (analyze/export).

## Implementation References

- `desktop/ui/src/components/AudioRecorder.vue`
- `desktop/ui/src/components/recorder/RecorderCapturePanel.vue`
- `desktop/ui/src/components/recorder/RecorderQuickCleanPanel.vue`
- `desktop/ui/src/components/recorder/RecorderExportPanel.vue`
- `desktop/ui/src/components/recorder/RecorderAdvancedDrawer.vue`
- `desktop/ui/src/lib/recorderFlow.ts`
