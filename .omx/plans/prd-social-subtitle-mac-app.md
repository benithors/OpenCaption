# PRD: Social Subtitle Mac App MVP

## Summary
Build a macOS desktop app that lets a creator import a video, transcribe speech with a user-supplied OpenAI API key, preview editable animated subtitles, and export a burned-in MP4.

## Why now
The repo is greenfield and the spec is already clarified enough for execution. The highest-value next step is a thin vertical slice that proves the risky workflow end-to-end before broader UI or packaging work.

## Product goal
Replace subscription captioning tools for a narrow creator workflow with a self-run desktop app.

## Users / job to be done
- Solo creator editing short-form social video
- Wants fast subtitle generation and styling without becoming a full video editor

## MVP scope
1. Import a local video file
2. Save and use an OpenAI API key
3. Extract audio and transcribe speech
4. Map transcript to subtitle cues
5. Preview subtitles over video
6. Lightly edit subtitle text
7. Change subtitle style:
   - font
   - text background box
   - one TikTok-like animated treatment
8. Export a burned-in MP4

## Explicit non-goals
- Timeline editing
- Subtitle timing editing
- Multiple transcription providers
- General-purpose video editor positioning
- Batch processing

## Best next step (approved plan)
Run a **Milestone 0 architecture spike** that freezes the **subtitle/render contract** and proves one thin vertical slice on **Electron + React + Remotion + local ffmpeg/ffprobe + OpenAI speech-to-text**.

### Thin-slice definition
Milestone 0 is complete when the project has:
1. a written subtitle/render contract covering cue timing, text, style tokens, safe areas, line breaking, font resolution, and one animation preset,
2. a fixed rendering decision that **Remotion is the canonical source of truth for both preview and export**,
3. one short sample video that can be imported, transcribed, previewed with editable subtitles, and exported as one burned-in MP4,
4. one oversized-input check proving preprocessing/chunking or clear limitation UX.

## Decision drivers
1. Fastest greenfield delivery path in a JS/TS stack
2. Lowest preview/export integration risk
3. Reversible architecture if shell choice changes later

## RALPLAN-DR
### Principles
- Optimize for one creator workflow, not a general editor
- Retire preview/export/transcription risk before UI polish
- Keep MVP text/style-only; do not add timing tools
- Prefer clean boundaries so shell/runtime choices stay reversible

### Options considered
#### Option A — Electron + React + Remotion + ffmpeg/ffprobe + OpenAI
- Pros
  - Fastest end-to-end path for a greenfield JS/TS app
  - React-based preview and render model align well
  - Electron packaging/distribution path is well documented
- Cons
  - Larger app footprint
  - Requires disciplined IPC/security boundaries

#### Option B — Electron + HTML/CSS preview + Remotion export
- Pros
  - Smaller initial preview surface
  - Could move faster for very first UI experiments
- Cons
  - High risk of preview/export drift
  - Requires two rendering implementations to stay aligned

#### Option C — Electron/Tauri + ffmpeg drawtext-style burn-in renderer
- Pros
  - Potentially simpler export pipeline in the short term
  - Avoids a richer React-based composition layer
- Cons
  - Harder to achieve the desired TikTok-like animation feel cleanly
  - Weaker styling ergonomics and lower confidence in future polish

#### Option D — Tauri + sidecar + React + ffmpeg + OpenAI
- Pros
  - Smaller shell
  - Explicit sidecar permissions make binary execution more controlled
- Cons
  - More packaging/runtime complexity early
  - Higher MVP integration risk for a first slice

#### Option C — Native SwiftUI / AVFoundation first
- Pros
  - Strongest mac-native posture long term
- Cons
  - Slowest time to first proof
  - Highest implementation and staffing risk for this repo today

### Invalidation rationale
Option B (HTML/CSS preview + Remotion export) is rejected because parity is a primary driver and two renderers would create avoidable drift. Option C (ffmpeg drawtext-style burn-in) is rejected because it weakens animation/styling quality and makes future polish harder. Option D (Tauri + sidecar) is the credible backup, but not the first choice, because current priority is proving the creator workflow fastest with the lowest greenfield integration risk.

## ADR
- **Decision:** Start with Electron + React + Remotion + ffmpeg/ffprobe + OpenAI speech-to-text.
- **Drivers:** delivery speed, preview/export fit, lowest integration risk.
- **Alternatives considered:** Tauri + sidecar; SwiftUI/native.
- **Why chosen:** It gives the quickest path to proving the full workflow with one language/tooling surface and lets us keep export and subtitle rendering logic close to the UI model.
- **Consequences:** The binary will be larger, and Electron security/IPC boundaries must be handled intentionally.
- **Follow-ups:** Reassess shell choice only after MVP proves the workflow or packaging footprint becomes a real constraint.

## Architecture outline
### Canonical rendering decision
- **Remotion is the source of truth for both preview and export.**
- `ffmpeg/ffprobe` are supporting media tools for ingest, metadata inspection, audio extraction/transcoding, and final assembly orchestration only.
- The UI must not invent a second subtitle renderer that can drift from export behavior.

### Subtitle/render contract (Milestone 0 artifact)
The contract must be written to `.omx/plans/render-contract-social-subtitle-mac-app.md` before Phase 1 work starts. The project must define and keep stable:
- cue shape (`id`, start/end, text, speaker optionality if any)
- style token schema (font family, size, weight, colors, background box, padding, animation preset)
- layout rules (safe area, max lines, line breaking, alignment)
- animation inputs and defaults
- font resolution policy for preview/export parity
- parity oracle fields: cue timing, text content, style-token values, layout box metrics, animation preset identity, and explicit font fallback behavior

### Top-level modules
- `desktop-shell`
  - Electron main process
  - secure IPC for file picking, key storage, export orchestration
- `ui-app`
  - React app for import, transcript review, style editing, preview controls
- `subtitle-domain`
  - transcript normalization
  - cue model
  - subtitle style schema
- `media-pipeline`
  - ffprobe metadata
  - ffmpeg audio extraction/compression
  - final export assembly
- `transcription-adapter`
  - OpenAI speech-to-text client
  - chunk/preprocess path for files exceeding the 25 MB upload limit
- `rendering`
  - shared subtitle composition used for preview/export

### Architectural guardrails
- Use one shared subtitle data model and one shared Remotion composition for preview and export to reduce parity bugs.
- Keep transcription preprocessing/chunking and export behind service boundaries so Tauri remains viable later.
- ffmpeg/ffprobe own media inspection, audio extraction/transcoding, and container assembly; Remotion owns subtitle visuals and frame rendering.
- Scope v1 subtitle editing to text only.
- Start with one animation preset and evolve later.
- Electron security is an upfront constraint: `contextIsolation` on, preload-only IPC, and no renderer access to raw fs/process/shell APIs.

## Milestones
### Milestone 0 — Contract + architecture proof
- Write the subtitle/render contract artifact
- Freeze the canonical rendering decision: Remotion drives both preview and export
- Define preprocessing/chunking policy: audio extraction, normalization, chunk sizing, transcript reassembly
- Lock Electron security posture: `contextIsolation`, preload bridge, narrow IPC surface
- **Exit criteria:** one edited subtitle matches between preview and exported MP4 on a short fixture; one oversized-input path is proven; acceptable export time is recorded for the fixture

### Milestone 1 — Scaffold + secure plumbing
- Electron + React app boots on macOS
- File import works
- API key save/load works
- One fixture video can be loaded into the app

### Milestone 2 — Transcription path
- Extract/compress audio from imported video
- Transcribe via OpenAI
- Handle oversized input via preprocessing/chunking
- Produce internal subtitle cue model

### Milestone 3 — Subtitle preview/editor
- Render cue preview over video
- Text editing updates preview
- Style controls for font, box, and one animation preset

### Milestone 4 — Export proof
- Export burned-in MP4 locally
- Validate output file exists, plays, and visually contains subtitles
- Keep one known-good sample fixture and evidence artifact

## Stories / execution slices
1. Bootstrap shell + UI + project layout
2. Add video import and metadata inspection
3. Add secure-ish API key storage and transcription client
4. Add subtitle domain model and text editing
5. Add preview composition with one animated preset
6. Add export pipeline and verification fixtures

## Risks and mitigations
- **OpenAI upload limit / long videos**
  - Mitigation: treat 25 MB as the hard request threshold; if extracted audio exceeds it, normalize audio, chunk it, transcribe sequentially, and reassemble transcript/cue output. If chunking still fails, show a clear limitation message instead of raw API failure.
- **Preview/export mismatch**
  - Mitigation: one shared subtitle composition and golden-output verification.
- **Export performance**
  - Mitigation: define initial supported clip length for MVP testing and measure early.
- **Electron security drift**
  - Mitigation: narrow IPC surface, no unnecessary Node exposure in renderer.

## Execution staffing
### Available agent types roster
- planner
- architect
- executor
- debugger
- test-engineer
- verifier
- writer

### Ralph path
- 1x `executor` at high reasoning
- Pull in `verifier` mindset continuously against the test spec
- Best when one owner should carry the thin slice end to end

### Team path
- Lane 1: `executor` (high) — shell/UI scaffold + file import + settings
- Lane 2: `executor` or `debugger` (high) — media pipeline + transcription adapter
- Lane 3: `test-engineer` or `verifier` (medium/high) — fixtures, regression coverage, export evidence

### Launch hints
- `$ralph build the Social Subtitle Mac App vertical slice from .omx/plans/prd-social-subtitle-mac-app.md using .omx/plans/test-spec-social-subtitle-mac-app.md as the verification contract`
- `$team 3:executor build the Social Subtitle Mac App vertical slice from .omx/plans/prd-social-subtitle-mac-app.md and keep one lane focused on .omx/plans/test-spec-social-subtitle-mac-app.md verification`
- `omx team 3:executor "build the Social Subtitle Mac App vertical slice from .omx/plans/prd-social-subtitle-mac-app.md and keep one lane focused on .omx/plans/test-spec-social-subtitle-mac-app.md verification"`

## Team verification path
- Lane 3 owns fixtures, smoke tests, and export evidence from day 1
- Require proof for import, transcription, preview, edit, and export before shutdown
- Do not mark complete without one fixture-based happy path and one oversized-input handling check

## Out of scope until after MVP proof
- Timing controls
- Template system
- Batch export
- Additional subtitle animation presets
- Local transcription model research beyond notes/spikes

## Milestone 0 signoff workflow
1. Write `.omx/plans/render-contract-social-subtitle-mac-app.md`. No Phase 1 implementation work proceeds until it exists.
2. Run the fixture workflow on `fixture-short.mp4`: import -> transcribe -> edit one subtitle -> preview -> export.
3. Run the oversized-input workflow on `fixture-long-or-large.mp4` or a synthetic oversized audio case.
4. Capture signoff evidence:
   - the render-contract file
   - a preview screenshot/frame capture
   - an exported MP4 artifact
   - a log showing chunking or clear limitation handling
   - a note recording export duration for the short fixture
5. Pass only if the parity oracle matches on the edited cue and no forbidden scope (timing/timeline/multi-provider) appears.

## Ownership for key risks
- `executor`: render contract, shell/UI, Remotion canonical renderer
- `debugger` or `executor`: transcription preprocessing/chunking and retry/failure handling
- `test-engineer` / `verifier`: parity oracle, fixture evidence, export-duration recording, font fallback verification
