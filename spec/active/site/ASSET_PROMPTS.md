# Site Asset Prompts and Icon Definition

Status: proposed
Owner: product/site
Updated: 2026-02-28

## Scope
This file defines:
- AI image prompts for website and README visuals.
- The reference description of the current desktop app icon (`desktop/src-tauri/icons/icon.png`).

## Hero image prompt (README/site)
Use this prompt when generating a hero visual:

```text
Create a modern product hero illustration for "Le Pupitre", a local-first desktop app for speech rehearsal.

Style: premium SaaS launch visual, clean, minimal, professional, high-contrast, soft gradients, subtle depth, no cartoon style.
Scene: a focused speaker rehearsing at a laptop with waveform/timeline UI elements, feedback cards, and progress indicators floating in a refined interface environment.
Mood: confident, calm, performance-oriented, privacy-first.
Color direction: slate/graphite base with electric cyan and warm amber accents.
Brand text: "Le Pupitre"
Tagline text: "Practice your voice, keep your data local, improve every talk."
Context cues: conference talk prep, product demo rehearsal, keynote practice.
Visual cues for privacy/local-first: shield/lock symbol near audio waveform, "on-device" indicator.
Composition: centered hero banner, 16:9, plenty of negative space for website header.
Avoid: school classroom imagery, chalkboard style, childlike mascots, playful stationery, clutter.
```

## Hero image prompt v2 (icon-coherent)
Use this prompt when you want direct visual continuity with the current app icon:

```text
Create a website hero image for "Le Pupitre", a local-first desktop app for speaking rehearsal.

Visual direction:
- Keep strong coherence with the app icon: rounded-square orange tile, layered white note sheets, subtle handwritten strokes, one small sticky-note accent, one minimal spark accent.
- Translate that icon language into a premium product scene (not a mascot scene): clean desktop workspace, waveform timeline, feedback cards, progress indicators.
- Tone: professional, focused, privacy-first, performance-oriented.

Composition:
- 16:9 hero banner, center-weighted composition, generous negative space for headline and CTA.
- Include app name: "Le Pupitre".
- Include tagline: "Practice your voice, keep your data local, improve every talk."

Style:
- Modern SaaS visual, crisp edges, soft depth, controlled shadows, high legibility.
- Palette: warm orange + off-white paper tones + graphite neutrals + subtle cyan data accents.
- Implied "on-device/private" cues (lock/shield near waveform), but keep them minimal.

Avoid:
- Classroom/chalkboard/school props
- Cartoon characters
- Busy collage look
- Excessive text inside the artwork
```

## Hero image prompt v3 (audience-as-hero)
Use this prompt when the speaking moment and audience impact should be the main story:

```text
Create a website hero image for "Le Pupitre" where the audience is the hero and the tool is the enabler.

Narrative:
- Primary focus: a speaker delivering a clear talk to an engaged audience.
- Secondary focus: Le Pupitre visible as a subtle support tool (laptop/tablet rehearsal dashboard with waveform, timing, and feedback cards).
- Message: you run the talk, Le Pupitre helps you prepare with confidence.

Visual direction:
- Professional keynote/demo environment (stage or conference room), modern and credible.
- Audience expressions show attention, understanding, and trust.
- Keep brand coherence with icon language through accents: warm orange highlights, soft paper-note motifs, minimal spark detail.

Composition:
- 16:9 hero banner.
- Speaker and audience occupy ~70% of visual weight.
- Product UI appears as supporting element (~30%), readable but not dominant.
- Leave clean negative space for headline/CTA.

Tone:
- Confident, high-stakes, calm control.
- Privacy-first and preparation-first (subtle on-device/privacy cue near the UI).

Text overlays:
- App name: "Le Pupitre"
- Optional line: "You deliver the talk. Le Pupitre prepares the run."

Avoid:
- Classroom/chalkboard style
- Cartoon mascots
- Generic stock-photo look
- UI mockup dominating the full frame
```

## Hero image prompt v4a (audience-as-hero, animals)
Use this prompt for a symbolic, non-human audience direction:

```text
Create a website hero image for "Le Pupitre" where the audience is represented by animals (no humans).

Narrative:
- Primary focus: a confident speaker figure on stage (stylized silhouette allowed) presenting to an audience of expressive animals that signal attention and engagement.
- Secondary focus: Le Pupitre shown as a supporting rehearsal tool on a nearby laptop/tablet UI (waveform, timing, feedback cards).
- Message: you run the talk, Le Pupitre prepares the run.

Visual direction:
- Premium editorial illustration, modern and clean, not childish.
- Animals should feel symbolic and diverse (e.g., fox, owl, bear, bird) with clear listening/posture cues.
- Keep brand coherence with warm orange accents, off-white note motifs, and minimal spark detail inspired by the app icon.

Composition:
- 16:9 hero banner.
- Audience and stage scene as primary visual mass.
- Product UI present but secondary.
- Generous negative space for headline and CTA.

Tone:
- Professional, intelligent, memorable.
- Privacy-first and preparation-first cues remain subtle.

Avoid:
- Realistic wildlife photo style
- Aggressive or chaotic animal behavior
- Classroom/chalkboard codes
- Full-frame UI takeover
```

## Hero image prompt v4b (audience-as-hero, emoji cartoon characters)
Use this prompt for a playful but controlled stylized direction:

```text
Create a website hero image for "Le Pupitre" where the audience is shown as custom emoji-style cartoon characters (no realistic humans).

Narrative:
- Main scene: a speaker delivering a talk to an audience of expressive emoji-like characters that show focus, curiosity, and positive reception.
- Tool role: Le Pupitre appears as a secondary UI panel with rehearsal metrics (time, pace, waveform, feedback checkpoints).
- Message: the speaker owns the moment; Le Pupitre supports preparation.

Visual direction:
- Vector/cartoon style with polished product quality (not childish sticker pack).
- Rounded forms, consistent line weight, controlled palette.
- Brand continuity: warm orange primary accent + neutral interface tones + subtle cyan data highlights.

Composition:
- 16:9 hero banner.
- Audience emotion and stage energy are dominant.
- UI appears as supporting context only.
- Leave clean space for title and CTA overlays.

Tone:
- Friendly, confident, modern.
- Suitable for professional product marketing despite cartoon styling.

Avoid:
- Meme aesthetics
- Random emoji clutter
- Heavy gradients that reduce legibility
- School/classroom visual tropes
```

## Icon prompt (app icon refresh direction)
Use this prompt when iterating the app icon style:

```text
Design a macOS/Windows desktop app icon for "Le Pupitre".

Concept: private speaking rehearsal workspace.
Format: 1:1, 1024x1024 master, export-ready for downscaling.
Style: crisp, modern, premium, tactile but not toy-like.
Palette: warm orange accent plus neutral light paper tones with strong edge contrast.
Motif: a clean document/speaking-note stack with one subtle highlight marker and a minimal "spark" detail to suggest insight.
Lighting: soft directional light with controlled shadow depth.
Silhouette: strong and readable at 32px.
Background: rounded-square tile, simple gradient, no busy texture.
Avoid: classroom props, cartoon faces, exaggerated mascots, noisy text glyphs.
```

## Current PNG icon definition
Reference file: `desktop/src-tauri/icons/icon.png`

- Resolution: 512x512 PNG.
- Container: rounded-square orange tile with a subtle border and soft drop shadow.
- Foreground: stacked white note pages, slightly torn paper edges, handwritten line marks.
- Accent elements: small orange sticky note and orange starburst mark.
- Depth: light 3D shading with a tactile paper feel.
- Brand signal: "speaking notes + feedback highlight" rather than generic education symbols.

## README usage guidance
- Current README uses this icon as a centered header mark.
- Recommended display size in README: width `120`.
- Keep only one primary icon instance in the header to avoid visual duplication.

## Style and hero coupling research list
Use this list when benchmarking landing-page direction:

1. Privacy-first minimal + product UI proof
   - Signal: strong local/privacy message and simple product framing.
   - Reference: `https://obsidian.md/`
2. Performance-forward hero + bold typography
   - Signal: speed, confidence, and immediate utility framing.
   - Reference: `https://www.raycast.com/`
3. Open distribution clarity + direct download funnel
   - Signal: homepage clearly drives to install/download.
   - Reference: `https://cap.so/`
4. Local/offline trust framing for desktop utility
   - Signal: local-first/offline cues aligned with product behavior.
   - Reference: `https://yaak.app/`
5. Pragmatic OSS header pattern (GitHub-first)
   - Signal: one-line value proposition + fast path to docs/releases.
   - Reference: `https://github.com/gitbutlerapp/gitbutler`
6. Security/performance benefits row (framework-style)
   - Signal: concise "small/fast/secure" style value bullets.
   - Reference: `https://tauri.app/`
