# Consensus Plan: Subtitle Style Presets, Fonts, and Drag Positioning

## Task
Add five subtitle presentation types to the current desktop app, including an emoji-enhanced mode, a 2-3-word mode, a 1-word mode, a TikTok-style font selector, and drag-and-drop subtitle positioning.

## Assumptions
- “Drag and drop for the subtitle” means dragging one global subtitle box position in the preview, not per-cue manual placement.
- Emoji enhancement should be opt-in and deterministic, using a local keyword-to-emoji map instead of another AI call.
- The five requested “types” are best represented as curated presets that combine chunking, animation, decoration, and default font/layout choices.

## RALPLAN-DR Summary

### Principles
1. Keep preview and export driven by the same shared subtitle contract.
2. Favor preset-driven UX over exposing dozens of raw controls.
3. Preserve an editable source transcript while allowing derived display chunking.
4. Avoid new runtime dependencies when native browser/React primitives are sufficient.
5. Ship social-video-friendly defaults first; defer full timeline editing.

### Decision Drivers
1. **Parity:** preview and Remotion export must render the same preset, font, chunking, emoji, and position behavior.
2. **Usability:** creators need a fast “pick a preset and go” workflow in `src/renderer/App.tsx:100-182`, not a complex editor.
3. **Scope control:** the current app only has one cue array, one style object, and one hard-coded animation in `src/shared/subtitles.ts:8-25`, `src/renderer/components/VideoPreview.tsx:75-103`, and `src/remotion/SubtitleComposition.tsx:20-54`.

### Viable Options

#### Option A — Shared preset contract + derived display cues + global draggable anchor **(chosen)**
- **Pros**
  - Keeps preview/export aligned by extending `SubtitleStyle` and deriving display cues from shared helpers.
  - Supports 2-3-word and 1-word modes without destroying original transcript edits.
  - Keeps drag scope manageable by saving normalized x/y anchor values in shared style state.
- **Cons**
  - Requires a slightly richer domain model and more tests.
  - Needs careful handling so derived cues stay stable when source text changes.

#### Option B — UI-only presets with destructive rechunking of the existing `cues` array
- **Pros**
  - Lower initial implementation effort.
  - Fewer type changes.
- **Cons**
  - Switching presets would rewrite user-edited cues and make undo/state reasoning fragile.
  - Preview/export parity becomes easier to break because behavior lives in multiple UI branches.

#### Option C — Full per-cue styling/positioning editor
- **Pros**
  - Maximum creative control.
- **Cons**
  - Far beyond the current MVP scope in `src/renderer/App.tsx:165-182`.
  - Would require timeline/editor infrastructure the repo does not currently have.

## Architect Review (applied)
- **Steelman antithesis:** keep the model simple by avoiding derived cues and font bundling; use only one `cues` array and system fonts.
- **Tradeoff tension:** simplicity of a single mutable cue list vs correctness of reversible preset switching.
- **Tradeoff tension:** keeping presentation metadata inside `SubtitleStyle` would minimize churn, but separating presentation from raw visual style better matches the new chunking/emoji/position responsibilities.
- **Synthesis:** keep `sourceCues` as the editable source of truth, compute presentation cues in shared helpers, and use a small bundled redistributable font catalog with explicit fallback stacks.

## Critic Review (applied)
- Added explicit acceptance criteria for chunk timing redistribution, drag clamping, emoji determinism, and preview/export parity.
- Added verification steps for source-to-derived cue conversion and preset switching.
- Narrowed drag scope to a single global anchor to keep the plan testable.
- Clarified that the shared contract should gain a dedicated presentation model rather than loosely accreting non-visual behavior onto freeform style fields.
- Added font licensing and export-path verification expectations so the plan stays testable and shippable.
- Resolved the source-vs-derived editability contradiction by keeping edits on source cues and treating emoji augmentation as deterministic presentation-layer decoration.

## Requirements Summary
- Extend the subtitle domain with a dedicated presentation model so the app can represent five curated presets, font choices, emoji decoration mode, and draggable subtitle position rather than a single locked `pop` preset (`src/shared/subtitles.ts:8-25`).
- Replace the current freeform font-family text input in `src/renderer/App.tsx:133-149` with a curated font selector and preset picker suited to short-form video styling.
- Introduce presentation chunking strategies on top of transcript segments, since cue generation currently mirrors input segments only (`src/shared/subtitles.ts:67-75`).
- Update preview and Remotion export so both read the same preset/position fields instead of each hard-coding bottom-center pop behavior (`src/renderer/components/VideoPreview.tsx:75-103`, `src/remotion/SubtitleComposition.tsx:20-54`).
- Add drag interaction in preview, backed by normalized position values that export can honor.

## Proposed Preset Set
1. **Classic Pop** — sentence/segment chunking, bold rounded box, upgraded pop animation.
2. **Emoji Punch** — sentence/segment chunking plus keyword emoji decoration and energetic bounce.
3. **Rapid 2-3** — derived 2-3-word chunks with punch-in animation for fast TikTok pacing.
4. **One Word Focus** — one-word chunks with stronger scale/flash emphasis.
5. **Clean Outline** — lighter box/outline treatment with smoother slide/fade motion.

## Proposed Font Catalog
- **Bebas Neue** — tall all-caps emphasis for punchy social captions.
- **Bricolage Grotesque** — rounded expressive sans for creator-style overlays.
- **Archivo Black** — dense bold fallback for strong legibility.
- **Inter Tight** — cleaner modern option for the lighter outline preset.

## Acceptance Criteria
1. The app exposes exactly five selectable subtitle presets in the workflow UI, with the active preset reflected in preview and export.
2. The app exposes a curated font selector with at least these 4 creator-friendly fonts (or direct equivalents with the same licensing posture) plus fallback stacks; selection updates preview and export consistently.
3. Selecting **Rapid 2-3** converts display subtitles into chunks of 2-3 words, preserving order and distributing timing across derived cues deterministically.
4. Selecting **One Word Focus** converts display subtitles into single-word cues, preserving order and deterministically redistributing timing.
5. Selecting **Emoji Punch** decorates matching words with local keyword-mapped emoji without making extra network calls; users can still manually edit source cue text and optionally keep/remove emoji manually in the source transcript.
6. Subtitle drag interaction in preview updates a normalized anchor position, clamps within the video safe area, and survives export.
7. Preview and exported Remotion output use the same animation preset, font, decoration, and position model for the same input props.
8. Existing import → transcribe → edit → export flow remains green in automated tests.
9. Editing transcript text remains reversible: source cue edits are preserved when switching between sentence, 2-3-word, and 1-word presentation modes.

## Implementation Steps

### 1) Extend the shared subtitle contract and derivation helpers
- Update `src/shared/subtitles.ts` to add:
  - `SubtitlePresetId`
  - a dedicated `SubtitlePresentation` (or equivalently named) object for preset id, chunking mode, animation id, emoji mode, selected font id, and normalized position anchor
  - richer `SubtitleAnimationPreset` values
  - font catalog metadata / selected font id
  - optional emoji mode / decoration strategy
  - normalized position anchor (`positionX`, `positionY` as 0-1 values inside safe bounds)
  - source-vs-derived cue helpers such as `buildPresentationCues(sourceCues, presentation)`
 - Keep `defaultSubtitleStyle()` for visual defaults and add a matching `defaultSubtitlePresentation()` (or equivalent) for preset/chunking/position defaults.
- Add helpers for deterministic rechunking and emoji decoration near `normalizeSegmentsToCues()`.
- Keep source transcript cues as the only editable truth; derived presentation cues remain computed data.

### 2) Tighten schema/render utilities around the new contract
- Update `src/shared/schema.ts` to validate new preset ids, font ids, and normalized position bounds.
- Update `src/shared/render.ts` so `getSubtitleBoxStyle()` accepts both visual style and presentation/layout hooks rather than only bottom padding (`src/shared/render.ts:20-35`).
- Add small pure helpers for animation/layout metadata shared by preview and Remotion.

### 3) Refactor renderer state around source cues + preset-driven display cues
- In `src/renderer/App.tsx`, split editable transcript state into `sourceCues` and memoized/derived `displayCues`.
- Replace the freeform font family field with:
  - preset selector
  - font selector
  - optional emoji toggle/label if needed for the chosen preset
- Keep text editing on `sourceCues`, then regenerate `displayCues` from the shared helpers.
- Surface preset descriptions so users understand what each mode does.
- Make the transcript panel explicit about source-vs-derived behavior so switching to 2-3-word or 1-word modes does not appear to “rewrite” the user’s original transcript.
- Preserve manual user-entered emoji in `sourceCues` even when automatic emoji decoration is enabled, so local overrides are not stripped on recompute.

### 4) Add drag-and-drop preview positioning
- Update `src/renderer/components/VideoPreview.tsx` to render the active display cue using shared layout data and pointer-driven drag handlers.
- Store drag output back into normalized style position fields in `App.tsx`.
- Extend `src/renderer/styles.css` with draggable overlay affordances, safe-area guides, and preset-specific visual polish while keeping video controls usable.

### 5) Unify export-side animation and layout behavior with preview
- Update `src/remotion/SubtitleComposition.tsx` and `src/remotion/types.ts` so Remotion consumes derived display cues and the same preset metadata.
- Replace the single spring scale treatment with a preset switch that maps to a bounded set of animation behaviors (pop/bounce/slide/focus/etc.).
- Ensure export uses the normalized position anchor rather than hard-coded bottom-center alignment.

### 6) Add bundled font assets and loading hooks
- Add a small redistributable font catalog (for example OFL-licensed display fonts) under a new asset folder such as `src/renderer/assets/fonts/` plus shared metadata.
- Start with a bounded catalog that maps closely to the proposed UI choices: Bebas Neue, Bricolage Grotesque, Archivo Black, and Inter Tight (or direct redistributable equivalents if packaging constraints require substitution).
- Load fonts in renderer CSS and ensure Remotion can resolve the same families during bundle/render.
- Fall back cleanly if a font fails to load.

### 7) Expand automated test coverage before execution is considered complete
- Update `src/test/subtitles.test.ts` for rechunking, emoji decoration, and style validation.
- Update `src/test/video-preview.test.tsx` for preset rendering and drag position changes.
- Update `src/test/app.test.tsx` for preset/font selection and export payload propagation.
- Update `src/test/export.integration.test.ts` or add a focused render-contract test to prove preview/export parity for preset/font/position inputs.

## Risks and Mitigations
- **Risk:** derived cue timing feels unnatural for 1-word mode.  
  **Mitigation:** distribute time proportionally by word count with a minimum cue duration and add tests for edge cases.
- **Risk:** drag logic breaks video control interaction.  
  **Mitigation:** limit dragging to the subtitle element, not the whole overlay; keep pointer-events off elsewhere.
- **Risk:** font packaging causes missing-font exports.  
  **Mitigation:** use a tiny bundled catalog with explicit fallback stacks and one export-focused verification test.
- **Risk:** bundled font choice introduces licensing or packaging churn.  
  **Mitigation:** restrict the catalog to redistributable fonts only and record the chosen licenses in the asset folder/docs.
- **Risk:** emoji mapping feels noisy.  
  **Mitigation:** keep the mapping intentionally small, deterministic, and preset-scoped; manual text edits remain available.

## Verification Steps
1. `npm test`
2. `npm run lint`
3. Run or extend `src/test/export.integration.test.ts` to confirm preset/font/position props survive the export path.
4. Manual smoke:
   - import sample video
   - transcribe
   - switch through all five presets
   - drag subtitle to upper/lower positions
   - export one preset with emoji and one with one-word mode
5. Confirm preview/export screenshots show the same font, position, and animation family for the same preset.

## ADR
### Decision
Adopt a shared preset contract with source-to-derived cue generation, a bundled creator-font catalog, deterministic emoji decoration, and one global draggable subtitle anchor.

### Drivers
- Current contract only supports one animation preset and primitive style values (`src/shared/subtitles.ts:8-25`).
- Current preview/export each hard-code their own subtitle placement/animation behavior (`src/renderer/components/VideoPreview.tsx:75-103`, `src/remotion/SubtitleComposition.tsx:20-54`).
- Requested feature set mixes style, chunking, and interaction; it needs a first-class preset model rather than ad-hoc UI toggles.

### Alternatives Considered
- Destructive rechunking of the existing `cues` array.
- System-font-only selector with no bundled assets.
- Per-cue drag/styling timeline editing.

### Why Chosen
This path is the smallest design that satisfies all requested features while keeping the preview/export contract aligned and reversible, without overloading the renderer with destructive cue rewrites.

### Consequences
- More domain modeling and tests are required up front.
- Preset switching remains reversible and predictable.
- Future work can add more presets without reopening renderer/export architecture.

### Follow-ups
- Validate font licensing before committing assets.
- Consider a future advanced editor for per-cue overrides only after preset mode is stable.
- Consider saving user preset preferences in `src/electron/settings-store.ts` after the core feature lands.

## Available-Agent-Types Roster
- `planner`
- `architect`
- `executor`
- `debugger`
- `test-engineer`
- `verifier`
- `writer`
- `code-reviewer`
- `security-reviewer`
- `designer`
- `code-simplifier`

## Follow-up Staffing Guidance
### If executed via `$ralph`
- **Lane 1 — implementation (`executor`, high):** shared contract, renderer, Remotion, font asset wiring.
- **Lane 2 — regression evidence (`test-engineer`, medium):** add/update tests for chunking, drag, preset payloads, render parity.
- **Lane 3 — sign-off (`architect` or `verifier`, medium/high):** confirm preview/export parity and scope discipline before completion.

### If executed via `$team`
- **Worker 1 — `executor` (high):** `src/shared/*` + `src/remotion/*`
- **Worker 2 — `executor` (high):** `src/renderer/*` drag/preset/font UI
- **Worker 3 — `test-engineer` (medium):** `src/test/*` plus manual verification notes
- Optional follow-up reviewer: `verifier` or `code-reviewer` after workers finish.

## Launch Hints
- Ralph path:  
  `$ralph --no-deslop "Implement .omx/plans/consensus-subtitle-style-presets.md with source-to-derived subtitle presets, bundled font selector, and draggable global subtitle position."`
- Team path:  
  `$team 3:executor "Implement .omx/plans/consensus-subtitle-style-presets.md; split shared/remotion work, renderer drag+font UI, and tests/manual verification."`
  
  If using tmux MCP tools instead of interactive CLI, mirror the same three lanes via `omx_run_team_start`.

## Team Verification Path
1. Shared/render worker proves type/model changes compile and export composition accepts new props.
2. Renderer worker proves preset selection, drag interaction, and font selection work in preview.
3. Test worker proves `npm test` + `npm run lint` stay green and records manual smoke evidence.
4. Final verifier/leader confirms no worker left divergent preset logic between preview and Remotion before shutdown.

## Changelog From Review Loop
- Chose source-cue + derived-cue architecture instead of destructive rechunking.
- Narrowed drag scope to a global anchor rather than per-cue positioning.
- Added explicit deterministic verification requirements for emoji, chunking, and preview/export parity.
- Clarified that presentation settings should live in a dedicated shared presentation model instead of loosely accreting onto freeform style fields.
- Added licensing and export-test expectations for bundled fonts.
