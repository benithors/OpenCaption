# Test Spec: Subtitle Style Presets

## Unit
- `src/shared/subtitles.ts`
  - builds derived 2-3-word cues deterministically
  - builds 1-word cues deterministically
  - applies emoji decoration deterministically
  - preserves manual emoji already present in source text
  - preserves ordering, reversibility of source cues, and minimum cue duration
- `src/shared/schema.ts`
  - rejects invalid preset ids, invalid font ids, and out-of-range position values

## Component
- `src/test/video-preview.test.tsx`
  - renders active cue for selected preset
  - updates subtitle position on drag and clamps inside safe bounds
- `src/test/app.test.tsx`
  - selecting preset and font changes export payload
  - source cue edits still flow into derived display cues

## Integration
- export payload contains preset/font/position fields accepted by Remotion composition
- preview/export share the same active preset metadata
- export path resolves bundled font choices with fallback behavior

## Manual Smoke
1. Import fixture video
2. Run transcription
3. Cycle through all 5 presets
4. Drag subtitle to at least two vertical positions
5. Export one emoji preset and one single-word preset
6. Inspect output for font, position, and pacing parity

## Exit Gates
- `npm test` passes
- `npm run lint` passes
- No new TypeScript diagnostics in touched files
