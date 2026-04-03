# Render Contract — Social Subtitle Mac App MVP

## Status
Frozen for Milestone 0 / Phase 1.

## Canonical renderer
- **Remotion is the single source of truth for preview and export.**
- Preview uses the shared `SubtitleComposition` through the Remotion Player.
- Export uses the same composition through `@remotion/renderer`.
- `ffmpeg/ffprobe` are support tools only for media inspection, audio preprocessing, and final container work.

## Cue schema
```ts
{
  id: string;
  startMs: number;
  endMs: number;
  text: string;
}
```

## Style token schema
```ts
{
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textColor: string;
  boxColor: string;
  boxOpacity: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  textAlign: 'center';
  animationPreset: 'pop';
  safeAreaX: number;
  safeAreaBottom: number;
  maxLines: number;
}
```

## Layout rules
- Subtitle box is horizontally centered.
- Subtitle box sits above the bottom safe area.
- Horizontal max width is `100% - safeAreaX * 2`.
- MVP allows up to two lines.
- Cue text is normalized for whitespace before display/export.

## Animation preset
- `pop`
  - active cue scales from `0.95` to `1.0`
  - uses one spring curve for preview and export
  - no per-word timing in MVP

## Font resolution
- Default font stack: `Arial, Helvetica, sans-serif`.
- Preview and export both use the same `fontFamily` token.
- If the chosen font is missing, fallback behavior must be documented in verification evidence.

## Parity oracle
Preview and export match when the checked cue has the same:
1. cue timing window
2. text content
3. style-token values
4. layout box placement and size
5. animation preset identity
6. font family or documented fallback path

## Oversized-input policy
- Treat **25 MB** as the transcription request threshold.
- Extract audio to mono 16k MP3 before upload.
- If extracted audio still exceeds threshold, chunk audio sequentially and reassemble transcript segments with offsets.
- If chunking fails, surface a clear limitation message rather than a raw API error.
