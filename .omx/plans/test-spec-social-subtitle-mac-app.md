# Test Spec: Social Subtitle Mac App MVP

## Verification goal
Prove Milestone 0 and the thin vertical slice work end to end on macOS for one creator workflow: import, transcribe, preview, edit, style, export, with preview/export parity and oversized-input handling explicitly checked.


## Milestone 0 contract checks
- Subtitle/render contract exists and covers cue schema, style tokens, layout rules, animation preset, and font-resolution policy
- Remotion is used as the canonical rendering path for both preview and export
- Electron security posture is enforced: `contextIsolation`, preload-only IPC, no renderer node exposure
- Preprocessing/chunking policy exists for oversized transcription inputs

## Test levels
- Unit: subtitle-domain transforms, style schema, cue mapping, oversized-audio chunking decisions
- Integration: Electron IPC, ffmpeg/ffprobe calls, OpenAI transcription adapter, export orchestration
- E2E/manual smoke: import sample video, transcribe, edit text, style subtitles, export playable MP4


## Parity oracle
Preview and exported output are considered matching when the checked cue(s) have the same:
- start/end timing
- text content
- style token values
- layout box position/size within the agreed render contract
- animation preset identity
- font family or documented fallback path

## Acceptance matrix
| Capability | Verification |
|---|---|
| Import local video | User selects supported local video and app loads metadata/preview |
| Save/use OpenAI API key | Key can be entered, stored, retrieved, and used for transcription |
| Transcription | Transcript returns subtitle cues for a sample video |
| Oversized input handling | Files that exceed the 25 MB transcription request threshold are normalized/chunked or rejected with a clear UX path |
| Subtitle preview | Preview overlays subtitles on video |
| Text editing | Editing subtitle text updates preview state |
| Style controls | Font, box, and one animation preset change preview/export output |
| Preview/export parity | One edited subtitle and one style preset visually match between preview and exported output |
| Export | App writes a burned-in MP4 that plays locally within the agreed fixture bound |
| Scope restraint | No timing editor, timeline UI, or multi-provider transcription appears in MVP |

## Fixture strategy
### Required fixtures
- `fixture-short.mp4`
  - short speech sample for happy-path transcription/export
- `fixture-long-or-large.mp4` or synthetic oversized audio case
  - used to verify preprocessing/chunking or clear failure handling

### Evidence artifacts
- exported MP4 from happy path
- screenshot or captured frame of subtitle preview
- test log showing transcription path and export completion

## Concrete tests
### Unit
1. cue model accepts transcript segments and normalizes subtitle entries
2. style schema validates font, background box, and animation preset fields
3. edit operation updates subtitle text without mutating unrelated cues
4. oversized-input planner chooses preprocess/chunk path when size threshold is crossed

### Integration
1. Electron IPC can invoke file import and return selected path/metadata
2. ffprobe returns media metadata for the imported fixture
3. ffmpeg extracts/transcodes audio suitable for transcription
4. OpenAI transcription adapter returns transcript data using configured API key
5. export orchestrator produces an output file at a requested location

### End-to-end / manual smoke
1. Launch app on macOS
2. Import `fixture-short.mp4`
3. Enter API key and run transcription
4. Confirm subtitle preview appears
5. Edit one subtitle text string and observe preview update
6. Change font/background/animation preset
7. Export MP4
8. Open exported file and confirm subtitles are burned in

## Failure-path checks
- Missing API key shows actionable guidance
- Unsupported or unreadable media shows actionable error
- Oversized transcription input follows preprocess/chunk path or gives a clear limitation message
- Export failure surfaces error state without corrupting original input

## Exit criteria
The MVP thin slice is complete only when:
1. all happy-path acceptance checks pass,
2. at least one oversized-input handling check passes,
3. export evidence exists,
4. no timing editor or multi-provider scope creep was introduced.

## Suggested ownership
- `test-engineer`: build fixtures, automated checks, and evidence collection
- `verifier`: confirm acceptance criteria and review exported artifacts
- `executor`: keep implementation aligned with this spec during delivery

## Milestone 0 signoff steps
1. Confirm `.omx/plans/render-contract-social-subtitle-mac-app.md` exists and defines the parity oracle fields.
2. Run the short-fixture happy path and capture a preview screenshot/frame plus exported MP4.
3. Compare one edited cue against the parity oracle fields.
4. Run an oversized-input case and record whether chunking succeeded or clear limitation UX appeared.
5. Record export duration for the short fixture and attach logs for transcription/export.
6. Fail signoff if timing editor, timeline UI, or multiple providers appear.
