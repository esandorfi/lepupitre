# Codex Rules (docs, ADR, changelog, quality)

## 1) README updates on request
When explicitly asked, Codex must:
1. Update `README.md` (human/onboarding),
2. Update `README_TECH.md` (architecture/tech),
3. Write README/README_TECH and ADRs in English.

## 2) ADR creation on request
When requested, create an ADR in `docs/adr/` with:
- Filename: `ADR-XXXX-title-kebab.md`

Minimal content:
- Context
- Decision
- Alternatives
- Consequences
- Status (Proposed/Accepted/Superseded)
- Code/doc references

## 3) ADR vs codebase divergence
Each ADR must include a **"Divergence"** section:
- `Aligned` if implementation matches.
- `Partially aligned` if there is drift.
- `Divergent` if the code contradicts the decision.
For the last two, list a remediation plan.

## 4) IPC schema alignment
IPC payloads must be schema-aligned end-to-end (Rust serde casing ↔ Zod schemas ↔ UI usage). If a field name changes, update all three and add a quick validation check.

## 5) Tests and lint are mandatory
Before commit, attempt:
- Backend: fmt + clippy + tests
- Frontend: lint + typecheck + tests

If unavailable (incomplete repo), document the limitation in the changelog and final response.

## 6) Changelog generation (release gate)
For any version bump or release:
- Update `CHANGELOG.md` in English.
- Generate a brief entry from Git history since the last logged version (or last tag).
- If the current tag/version is missing from the changelog, add it before release.
- Use `pnpm -C desktop changelog` (or `node scripts/changelog.mjs <version>`).
- The generator groups by conventional commit type; keep commit subjects consistent.

## 7) MR = logical stop (quality & review)
At each MR, Codex must:
- pause and reflect,
- review logic (risks/edge cases),
- run available quality checks,
- document results before proceeding.

## 8) Response format (commit style)
When delivering results, start with a conventional commit title line
(e.g. `feat: ...`, `fix: ...`, `chore: ...`), then detail the changes.
