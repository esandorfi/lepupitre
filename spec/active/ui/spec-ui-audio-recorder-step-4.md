# Audio Recorder Future Step 4 - Full Platform Integration (Local-First + Optional Cloud)

## Goal
Deliver complete end-state integration: dynamic library updates, richer profile evolution, quest/talk/feedback/export orchestration, and privacy-safe telemetry/metrics.

## UX Priorities
1. The app works fully offline.
2. Remote updates improve content without destabilizing core flow.
3. Recommendations feel personalized but never opaque.
4. User controls privacy and telemetry explicitly.
5. Progress across quest/talk remains coherent and actionable.

## Scope
1. Manifest system (local-first, cloud-optional):
   - versioned card library
   - signature verification
   - local cache + rollback to last-known-good
2. Optional profile/progress sync (opt-in).
3. Expanded orchestration policy:
   - context-aware card selection
   - feedback-linked recommendation
   - anti-repetition and progression balancing
4. Integration expansion:
   - quest pipeline consumes next-action decisions
   - talk progression receives trend signals
   - feedback service contributes structured signals
   - export bundles include transcript + anchors + feedback snapshots
5. Telemetry architecture:
   - local event bus + budget controls
   - opt-in upload adapter
   - transparent telemetry settings and export/delete support

## Non-Goals
1. No mandatory cloud dependency for core recorder flow.
2. No black-box model deciding critical user progression.
3. No unverified remote config execution.

## Architecture Decisions
1. Keep one local-first core.
2. Add optional cloud adapters behind consent gates.
3. Use signed manifest updates only.
4. Keep orchestration explainable (`DecisionTrace`).

## Public Interface Additions (Target)
1. `library_manifest_status`
2. `library_manifest_refresh`
3. `orchestration_next_action`
4. `profile_preferences_get/set`
5. `telemetry_settings_get/set`
6. `decision_trace_get`

## Acceptance Criteria
1. App remains fully usable without network.
2. Manifest update can activate safely or rollback automatically.
3. Next-action recommendations are context-aware and explainable.
4. Telemetry upload is disabled by default and controlled by user consent.
5. Quest/talk/feedback/export remain consistent under local and hybrid modes.

## Test Plan
1. Manifest tests:
   - signature valid/invalid
   - activation/rollback
2. Orchestration tests:
   - context routing
   - feedback-driven next action
   - deterministic behavior
3. Privacy tests:
   - opt-in telemetry gate
   - no upload when disabled
4. Integration tests:
   - end-to-end quest/talk/feedback/export loops
5. Resilience tests:
   - offline boot
   - stale manifest
   - partial sync failures

