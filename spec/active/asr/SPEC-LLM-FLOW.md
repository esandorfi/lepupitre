Below is a **full coding specification** for a Wispr-Flow-style pipeline with **local Whisper.cpp ASR** + **cloud LLM post-processing** (Layer 1). Then a second implementation step adds **Layer 2 (habits coach)** and **Layer 3 (coherence reviewer)** with evaluation. I’m including **prompts**, an **architecture diagram**, and **metrics** (including metrics to optimize chunking/segmentation and scheduling).

---

# 0) Scope and goals

**Primary goal (Phase 1 / Layer 1):**
Make dictation feel “SOTA” on CPU-only devices by combining:

* **Local streaming ASR** (Whisper.cpp)
* **Stable incremental text** (commit/draft buffers)
* **Cloud LLM editor** that cleans punctuation, casing, formatting, and removes safe fillers — without changing meaning
* **Minimal jitter**: previously committed text should not get rewritten during live dictation

**Constraints**

* Languages: **French + English** (mixed)
* Dictation length: **30 seconds to 5 minutes**
* No GPU locally; cloud LLM allowed
* Must be production-safe: validation and fallbacks

---

# 1) Architecture (Phase 1: “Whisper Flow SOTA way”)

## 1.1 Components

**Local (device)**

1. **Audio Capture**
2. **VAD + Segmentation Controller** (silence detection, utterance boundaries, scheduling LLM calls)
3. **Whisper.cpp Streaming ASR Adapter**
4. **Text Stability Engine** (committed vs draft tail; diff/align)
5. **Local Deterministic Normalizer** (glossary/snippets, basic formatting)
6. **UI Output Renderer** (raw live + polished replacements)
7. **Telemetry & Metrics Recorder** (optional but strongly recommended)

**Cloud**
8. **LLM Editor API** (Layer 1)
9. (Later) **LLM Coach API** (Layer 2)
10. (Later) **LLM Coherence API** (Layer 3)

## 1.2 Data flows

### Real-time loop (Layer 1)

* Audio frames → VAD → chunk audio window
* Whisper.cpp returns partial hypotheses periodically
* Stability engine updates `draft_text` with minimal churn
* On utterance end or scheduled time: run normalization + send to cloud editor
* Replace only the editable tail in UI
* Commit finalized text when stable

## 1.3 Architecture diagram (ASCII)

```text
┌──────────────────────────── Local Device ────────────────────────────┐
│                                                                      │
│  ┌───────────┐   frames   ┌─────────────┐   segments   ┌───────────┐ │
│  │ Audio In  ├───────────►│  VAD +      ├─────────────►│ Whisper   │ │
│  │ (16k mono)│            │ Segmentation│              │ .cpp ASR  │ │
│  └───────────┘            └──────┬──────┘              └────┬──────┘ │
│                                   │ partial text              │       │
│                                   ▼                           ▼       │
│                            ┌─────────────┐        ┌─────────────────┐ │
│                            │ Stability   │        │ Normalizer      │ │
│                            │ Engine      │        │ (glossary,      │ │
│                            │ commit/draft│        │ snippets, rules)│ │
│                            └──────┬──────┘        └──────┬──────────┘ │
│                                   │ editable tail         │ payload   │
│                                   ▼                       ▼           │
│                            ┌─────────────┐        ┌─────────────────┐ │
│                            │ UI Renderer │◄───────┤ Cloud LLM Editor │ │
│                            │ (raw→polish)│  edits │ (Layer 1)        │ │
│                            └──────┬──────┘        └─────────────────┘ │
│                                   │                                  │
│                            ┌──────▼────────┐                         │
│                            │ Metrics Store │                         │
│                            └───────────────┘                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

# 2) Core algorithm specs (Phase 1)

## 2.1 Audio + VAD + segmentation

### Requirements

* Input: 16 kHz mono PCM
* Frame size: 20ms (320 samples) or 30ms (480 samples)
* VAD decision every frame, but boundary uses a rolling window

### Parameters (good defaults)

* `vad_speech_threshold`: tuned to your VAD library
* `silence_ms_to_end_utterance`: **800 ms** (public talk can be 900–1100ms)
* `min_utterance_ms`: **600 ms** (avoid tiny fragments)
* `max_utterance_ms`: **12,000 ms** (force segmentation for very long runs)
* `overlap_ms`: **200–400 ms** overlap between ASR decode windows to avoid cut words

### Output

* `Utterance` objects:

  * `audio_start_ts`, `audio_end_ts`
  * `raw_text` (from stability engine, see below)
  * `language_hint` (optional)
  * `id`

## 2.2 Whisper.cpp streaming adapter

### Requirements

* Periodically decode the latest audio buffer
* Emit partial hypotheses with timestamps if available (segment-level is fine)
* Support both Mac/Windows consistently

### Output event types

* `ASRPartial(text, start_ts, end_ts, confidence?)`
* `ASRFinal(text, start_ts, end_ts)`

(If Whisper.cpp does not provide “final”, you derive final using VAD utterance end.)

## 2.3 Stability engine (commit/draft model)

The goal is to prevent jitter while still improving as ASR updates.

### State

* `committed_text`: string (locked)
* `draft_text`: string (editable tail)
* `draft_history`: last N hypotheses with timestamps

### Update rule (on each ASRPartial)

1. Take `new_hypothesis`
2. Align `previous_draft` vs `new_hypothesis` (word-level diff)
3. Update `draft_text` to `new_hypothesis`
4. Identify stable prefix within draft:

   * A token span is “stable” if unchanged across last `k` updates OR VAD indicates end of utterance.
5. Move stable prefix from draft → committed (only when safe)

### Recommended defaults

* `stable_k_updates = 2` (for frequent partial updates)
* `min_stable_chars = 20`
* Commit only at:

  * utterance end, OR
  * stable prefix > threshold and time since last commit > 1s

## 2.4 When to call the cloud LLM editor (Layer 1 scheduling)

You have 3 options; for your 30s–5min usage, use **hybrid**:

### Recommended: per-utterance + final pass

* **On utterance end (VAD)**: send only the utterance tail (1–3 sentences)
* **On dictation stop**: send the entire transcript for a final consistency polish

### Guardrails

* Don’t call editor for tiny fragments: `min_chars_for_llm = 40`
* Merge very short utterances: if utterance < 1.2s and next begins within 500ms, merge

### Payload should include

* `mode`: everyday / public_talk / training
* `tone`: casual / neutral / confident
* `format`: plain / paragraphs / bullets
* `glossary`: {preferredSpellings, expansions}
* `raw_text`: editable tail only (or whole text at final)
* `committed_text_hash`: to ensure you don’t rewrite committed text by mistake

## 2.5 Local normalizer (before LLM)

Apply deterministic transformations to reduce burden and increase safety:

**Rules**

* Normalize spaces, remove double spaces
* Normalize quotes (optional)
* Apply glossary replacements (case-sensitive rules)
* Expand snippets (e.g., “addr pro” → full address)
* Convert spoken formatting commands (optional):

  * “nouvelle ligne” / “new line”
  * “point” / “period”
  * “deux points” / “colon”
  * Only if you support that UX; otherwise leave as words

---

# 3) Layer 1 Cloud LLM Editor specification

## 3.1 Output format (recommended)

Use **JSON** (structured output) so your code can validate and apply safely.

### Response schema (Layer 1)

```json
{
  "clean_text": "string",
  "preserved": {
    "numbers_ok": true,
    "urls_ok": true,
    "emails_ok": true
  },
  "warnings": ["string"]
}
```

If your LLM/provider can enforce JSON schema, do it. If not, use strict prompting + robust JSON extraction.

## 3.2 Validation rules (critical)

After receiving `clean_text`, validate:

* Numbers: all numeric substrings in raw appear in cleaned (or acceptable transformations like “1,000” vs “1000”)
* URLs/emails: identical
* Optional: preserve proper nouns from glossary
* If fails:

  1. Re-try once with stricter prompt (“DO NOT change numbers/URLs; return text identical except punctuation”)
  2. If still fails: fall back to local punctuation only

## 3.3 Editor prompt pack (French+English, mixed)

### System prompt (Layer 1 Editor)

Use as the system instruction:

> You are a transcript editor for bilingual French/English dictation.
> Your task is to clean and format the transcript WITHOUT changing meaning.
> Rules (must follow):
>
> 1. Do NOT add new ideas, facts, or content. Do NOT remove meaning.
> 2. Do NOT translate. Keep French parts in French and English parts in English.
> 3. Preserve EXACTLY: numbers, dates, currencies, URLs, emails, @handles, code tokens, and any terms listed in the glossary.
> 4. Remove filler words and false starts only when it does not change meaning.
> 5. Improve punctuation, capitalization, and paragraph breaks.
>    Output must be valid JSON matching the required schema, and nothing else.

### User prompt template (Layer 1 Editor)

Send as user message:

```text
MODE: {everyday|public_talk|training}
TONE: {casual|neutral|confident}
FORMAT: {plain|paragraphs|bullets}

GLOSSARY (preferred spellings / expansions):
{glossary_block}

RAW_TEXT:
{raw_text}

Return JSON:
{
  "clean_text": "...",
  "preserved": {"numbers_ok": true/false, "urls_ok": true/false, "emails_ok": true/false},
  "warnings": ["..."]
}
```

### Mode hints

* everyday: natural punctuation, light cleanup
* public_talk: shorter sentences, clearer pauses, more paragraph breaks
* training: keep structure, remove stutters, but don’t “rewrite as an essay”

---

# 4) Chunk/segment optimization spec

You asked for **metrics to optimize segment chunks and when doing it**. This is where most “SOTA feel” comes from.

## 4.1 What you can tune

* VAD silence threshold & end-of-utterance time
* Max utterance length (forcing segmentation)
* LLM call cadence (per utterance vs periodic)
* Tail size for editing (how much text you allow LLM to rewrite)
* Stability engine “commit threshold”

## 4.2 Metrics for chunk optimization

### Latency metrics (user experience)

* **T_partial**: time from speech to first visible text (target < 500ms–1200ms depending on your decode loop)
* **T_finalize**: time from end of utterance (silence threshold reached) to polished text displayed

  * target: **< 800ms** (feels snappy) to **< 1500ms** acceptable on slow networks
* **Jitter rate**: number of times already-displayed words change per minute

  * target: as low as possible; measure as “replaced characters / minute”

### Segmentation quality metrics

* **Over-segmentation**: utterances too short

  * measure: % utterances < 1.0s or < 30 chars
* **Under-segmentation**: utterances too long

  * measure: % utterances > 12s or > 250 chars
* **Boundary error proxy**: proportion of utterances where the next utterance begins with a continuation word (“and”, “so”, “et”, “donc”) suggesting you cut too early

### Cost metrics (cloud)

* tokens sent per minute
* calls per minute
* average payload size
* cost per minute (estimated)

### Quality metrics (post-edit)

* **Meaning preservation proxy**: numeric/url/email preservation pass rate
* **Over-edit distance**: normalized Levenshtein distance between raw and clean

  * too low => no cleanup; too high => rewriting
* **Punctuation improvement**:

  * sentence boundary count change
  * avg sentence length reduced toward target range:

    * public talk target: 8–18 words per sentence
    * everyday: 10–25
* **Language integrity**: % segments where LLM introduces translation (detected by language-id shift)

## 4.3 Optimization procedure

Run A/B experiments over parameter sets:

* `silence_ms_to_end_utterance`: 650 / 800 / 950
* `max_utterance_ms`: 8s / 12s / 16s
* `tail_edit_chars`: 250 / 400 / 700
* `stable_k_updates`: 1 / 2 / 3

Choose configs that minimize:

* jitter, T_finalize, under/over segmentation
  while maximizing:
* preservation pass rate, punctuation score

---

# 5) Evaluation metrics for Phase 1 (Layer 1)

You can evaluate without labeled data using “proxy metrics”, and with labeled data using human ratings.

## 5.1 Automatic metrics (no ground truth needed)

* **Preservation pass rate** (numbers/URLs/emails)
* **Jitter rate**
* **Finalize latency**
* **Edit distance ratio**
* **Sentence length distribution** (before vs after)
* **Paragraphing rate** (public talk should increase)

## 5.2 Human evaluation (recommended quick rubric)

Sample 30 clips (FR/EN mixed), score 1–5:

* **Accuracy (meaning preserved)**
* **Readability (punctuation/format)**
* **Naturalness**
* **Over-editing** (should be low)
* **Speed/Responsiveness**

---

# 6) Phase 2: add Layer 2 (habits coach) and Layer 3 (coherence)

## 6.1 Layer 2: Habits coaching specification

### Inputs

* raw transcript (optionally with timestamps per segment)
* cleaned transcript (optional)
* mode (training/public talk)
* language mix

### Outputs (JSON)

* filler counts by language
* example excerpts (short)
* repetition patterns
* “run-on” detection and suggested splits
* top 3 actionable tips

### Metrics (Layer 2)

**Automatic**

* filler detection precision proxy: compare LLM-detected fillers vs a deterministic filler dictionary on raw text
* stability: variance of counts when rerun on same input (should be low)
  **Human**
* actionability rating (1–5)
* correctness (are examples true?)

### Layer 2 Prompt (Coach)

**System**

> You are a speaking coach for bilingual French/English. Analyze the transcript and identify speaking habits (fillers, repetitions, run-on sentences). Do not rewrite the transcript. Provide counts and short examples. Return JSON only.

**User template**

```text
MODE: {training|public_talk|everyday}
TRANSCRIPT_RAW:
{raw_text}

Return JSON with:
- fillers: [{token, lang, count, examples:[...]}]
- repetitions: [{phrase, count, examples:[...]}]
- run_on: [{excerpt, suggestion}]
- top_actions: [ ... ]
```

## 6.2 Layer 3: Coherence & clarity reviewer specification

### Inputs

* cleaned transcript (preferred)
* optional context: “this is a talk about X”
* language mix

### Outputs (JSON)

* unclear references (“it/they/ça/cela”)
* missing context
* contradictions / inconsistencies (careful: “possible” not asserted)
* structure tips (intro/body/close) for public talk

### Metrics (Layer 3)

**Automatic**

* “flag density”: flags per 1k words (too high can be noisy)
* rerun stability: same input yields similar flags
  **Human**
* usefulness rating (1–5)
* false positive rate (flags that are not issues)

### Layer 3 Prompt (Reviewer)

**System**

> You are a clarity and coherence reviewer for bilingual French/English transcripts. Identify unclear references, missing context, and structural issues. Do not invent facts. If uncertain, mark as “possible”. Return JSON only.

**User template**

```text
MODE: {public_talk|training|everyday}
TEXT:
{clean_text}

Return JSON with:
- unclear_references: [{excerpt, why, suggestion}]
- missing_context: [{excerpt, suggestion}]
- possible_inconsistencies: [{excerpt, why, question_to_clarify}]
- structure: {strengths:[], improvements:[]}
```

---

# 7) Implementation plan (phased)

## Phase 1 (Layer 1 only)

1. Implement VAD + utterance segmentation controller
2. Integrate whisper.cpp streaming
3. Build stability engine (commit/draft + diff)
4. Local normalizer + glossary/snippets
5. Cloud editor call + JSON validation + fallback
6. UI: show raw immediately; replace tail on polish
7. Metrics logging

## Phase 2 (Evaluation + Layers 2 & 3)

8. Add coach and reviewer cloud calls (usually **at end-of-dictation** or per segment in training mode)
9. Build dashboards for metrics + A/B tests
10. Iterate thresholds and prompt tuning

---

# 8) Suggested defaults (ready to code)

* `silence_ms_to_end_utterance = 850`
* `min_utterance_ms = 600`
* `max_utterance_ms = 12000`
* `tail_edit_chars = 500` (cap LLM scope to last ~500–800 chars)
* `stable_k_updates = 2`
* `min_chars_for_llm = 40`
* LLM calls:

  * on utterance end (if >= 40 chars)
  * final polish at stop

---

If you want, I can turn this into:

* a **concrete interface spec** (TypeScript/Python structs, event bus, state machine)
* plus a **test plan** (unit tests for diff/commit, JSON validation, filler counters, A/B harness)
  —without asking you any more questions.
