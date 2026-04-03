# Consensus Plan — macOS Subtitler

## Recommendation
**Best next step right now:** run a **Milestone 0 architecture spike** that freezes the subtitle/render contract and proves a thin vertical slice using **Electron + React UI + local Remotion render/export + OpenAI-only transcription**, with an explicit **audio extraction/chunking** path to handle OpenAI’s **25MB upload cap**.

This is the fastest way to prove the core loop while avoiding parity drift: **import video → transcribe → review/edit subtitles → style → export burned-in video**.

## Principles
1. Prove end-to-end user value before adding editor depth.
2. Keep v1 local-first for preview and export.
3. Stay OpenAI-only for transcription, but isolate that boundary.
4. Design around hard constraints early, especially the 25MB cap.
5. Avoid scope creep: no timeline editor, no manual timing editor in v1.

## Top 3 Decision Drivers
1. Fastest path to a usable macOS demo
2. Lowest-risk local render/export path
3. Early de-risking of upload-limit and packaging issues

## Viable Options
### 1) Electron + React + Remotion + OpenAI STT — Recommended
**Pros:** mature packaging/distribution; good desktop shell fit; Remotion aligns with local rendering; best immediate delivery confidence.
**Cons:** heavier runtime; needs disciplined IPC and API-key handling.

### 2) Tauri + React + sidecar media pipeline
**Pros:** leaner shell; sidecars are attractive for external binaries with explicit permissions.
**Cons:** more upfront process/permission complexity; higher greenfield integration risk now.

### 3) Transcription/editor first, defer export validation
**Pros:** smaller first build.
**Cons:** delays proving the main value proposition: burned-in subtitle export.

## Phased Plan
### Milestone 0 — Architecture spike
- Write the subtitle/render contract: cue schema, style tokens, safe areas, line breaking, font resolution, animation preset.
- Fix the rendering source of truth: **Remotion drives both preview and export**.
- Define shell/process boundaries and IPC with Electron security guardrails (`contextIsolation`, preload-only IPC, no renderer node access).
- Define preprocessing/chunking policy for oversized inputs.
- Prove import, audio extraction, chunked transcription, subtitle generation, Remotion preview, burned-in export.
- **Exit:** one sample video completes the full loop on macOS, one oversized-input path is proven, and one edited subtitle matches between preview and export.

### Phase 1 — Thin vertical slice
- Import video
- Accept user API key
- Transcribe with OpenAI (`gpt-4o-transcribe` / `gpt-4o-mini-transcribe`)
- Show subtitle list + preview
- Allow text correction only
- Export burned-in video
- **Exit:** a non-author completes the happy path on a short clip.

### Phase 2 — Styling/polish
- Font, background box, presets
- TikTok-like animated caption feel
- Preview responsiveness
- **Exit:** 2–3 presets match preview/export behavior.

### Phase 3 — Packaging/hardening
- macOS packaging/distribution
- Error handling/retries
- Long-file UX
- API-key storage decision
- **Exit:** packaged app works on representative clips.

## ADR
- **Decision:** Electron shell + React UI + local Remotion render/export + OpenAI-only transcription with explicit chunking for the 25MB cap.
- **Drivers:** fastest end-to-end validation; mature packaging; good local-render fit.
- **Alternatives considered:** Tauri + sidecars; export-deferred approach.
- **Why chosen:** lowest immediate product risk while keeping a future shell migration possible.
- **Consequences:** heavier runtime now; process/security boundaries matter; non-goals stay deferred.
- **Follow-ups:** validate chunking UX, long-video performance, and API-key handling.

## Staffing Guidance
### Ralph
Best for **Milestone 0 + Phase 1** with one owner, sequentially:
1. architecture/process model
2. transcription/chunking
3. Remotion preview/export
4. verification

### Team
Best after Phase 0 approval.

**Agent roster:** planner, architect, executor, debugger, test-engineer, verifier, writer.

**Suggested lanes**
1. Shell/import/IPC
2. Transcription + chunking/upload handling
3. Remotion preview/export + style presets
4. Fixtures + verification
5. Optional writer for PRD/test-spec/docs

## Reasoning Levels
- Architecture/process boundaries: **high**
- Media + transcription integration: **high**
- UI/editor + styling: **medium**
- Packaging/docs: **medium**
- Routine scaffolding/tests: **medium-low**

## Team Launch Hints
- **Ralph:** execute only **Phase 0 + Phase 1** against the PRD/test spec.
- **Team:** run `team-plan -> team-exec -> team-verify` with lane splits above.

## Verification Path
1. Test with 3 fixtures: short, long/chunked, style-heavy.
2. Prove full macOS flow: import → transcribe → edit text → style → export.
3. Confirm preview and final export visually match for tested presets.
4. Verify oversized media is handled before raw API-cap failure.
5. Verify packaged-app install and export.

## Serious Alternatives + Why They Lost
1. **HTML/CSS preview + Remotion export** — rejected because parity is a key driver and two renderers create avoidable drift.
2. **ffmpeg drawtext-style renderer** — rejected because animation/styling quality and future polish confidence are weaker.
3. **Tauri + sidecars** — credible backup, but higher early integration complexity than Electron for this greenfield MVP.

## Milestone 0 Signoff Evidence
- `.omx/plans/render-contract-social-subtitle-mac-app.md` exists
- preview screenshot/frame for the edited subtitle
- exported MP4 from the same fixture
- transcription/chunking log for oversized-input proof
- note with export duration for the short fixture

## Parity Oracle
The edited cue must match between preview and export on: cue timing, text, style tokens, layout box, animation preset, and font family/fallback behavior.
