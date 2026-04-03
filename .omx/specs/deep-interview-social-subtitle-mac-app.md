# Execution-Ready Spec: Social Subtitle Mac App

## Metadata
- Profile: standard
- Rounds: 6
- Final ambiguity: 17.1%
- Threshold: 20%
- Context type: greenfield
- Context snapshot: `.omx/context/social-subtitle-mac-app-20260403T113909Z.md`

## Clarity Breakdown
| Dimension | Score |
|---|---:|
| Intent | 0.82 |
| Outcome | 0.82 |
| Scope | 0.84 |
| Constraints | 0.80 |
| Success | 0.90 |

## Intent
Build a Mac app that replaces subscription-based captioning tools with a simpler creator workflow the user can run themselves, starting with API-based transcription but designed around a practical subtitle-generation workflow rather than a full video editor.

## Desired Outcome
A desktop app for macOS where the user can:
1. import a video,
2. transcribe speech using an OpenAI Whisper API key,
3. preview subtitles over the video,
4. lightly edit subtitle text,
5. configure subtitle appearance/animation,
6. export a new rendered video with burned-in subtitles.

## In Scope (MVP)
- macOS desktop app
- Video import for common social-video aspect ratios / source videos
- Transcription using OpenAI Whisper via user-supplied API key
- Subtitle preview on top of video
- Subtitle style configuration including at least:
  - font
  - text background box
  - TikTok-style animated subtitle feeling
- Light subtitle **text** editing
- Export of a newly rendered video with subtitles burned in

## Out of Scope / Non-goals (MVP)
- Full timeline editing
- Subtitle timing editing
- Support for many transcription providers in v1
- General-purpose video editor positioning

## Decision Boundaries
OMX may decide without further confirmation:
- the specific desktop framework / stack,
- the rendering/export pipeline,
- the initial OpenAI Whisper integration approach,
- the exact first-pass subtitle animation implementation,
provided the MVP capabilities and non-goals above are preserved.

OMX should **not** silently expand scope into timeline editing, multi-provider transcription, or advanced subtitle timing tools without explicit approval.

## Constraints
- Must run on the user's MacBook / macOS desktop environment
- MVP can start with OpenAI Whisper API-key transcription instead of local models
- Longer-term local-model research is desirable, but not required for MVP
- Subscription avoidance is a motivating product constraint

## Testable Acceptance Criteria
- User can open/import a video file in the app
- User can enter/save an OpenAI API key and run transcription
- App displays subtitle preview over the video
- User can edit subtitle text content before export
- User can modify subtitle style settings including font and background box
- App provides a TikTok-like animated subtitle presentation (exact implementation to be defined in planning)
- App exports a new video file with subtitles rendered into the video
- MVP does **not** expose timeline editing, timing-edit tools, or multiple transcription providers

## Assumptions Exposed + Resolutions
- **Assumption:** local-first was mandatory for MVP  
  **Resolution:** not required initially; start with OpenAI Whisper API key.
- **Assumption:** subtitle correction might require full timing/timeline tooling  
  **Resolution:** only light text edits are required in v1; no timing editing.
- **Assumption:** product might need to compete as a full editor  
  **Resolution:** no; narrow workflow app is acceptable.

## Pressure-pass Findings
Revisiting the transcript-correction scenario narrowed the MVP significantly: text correction is required, but timing edits are explicitly deferred.

## Brownfield Evidence vs Inference Notes
- Evidence: repository currently contains only OMX/Codex/AGENTS scaffolding and no visible product source files.
- Inference: implementation can be planned as greenfield application work.

## Technical Context Findings
- Current repository appears greenfield for app code.
- `omx explore` was attempted per repo guidance but unavailable because the local explore harness is not installed/built.

## Recommended Handoff
Primary recommendation: **`$ralplan`** to turn this clarified brief into a PRD + test spec before implementation.
