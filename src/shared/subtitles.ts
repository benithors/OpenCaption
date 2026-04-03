export type Cue = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
};

export type SubtitleAnimationPreset = 'pop';

export type SubtitleStyle = {
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
  animationPreset: SubtitleAnimationPreset;
  safeAreaX: number;
  safeAreaBottom: number;
  maxLines: number;
};

export type TranscriptSegment = {
  id?: string | number;
  start: number;
  end: number;
  text: string;
};

export type TranscriptionResult = {
  text: string;
  segments: TranscriptSegment[];
  source: 'openai' | 'mock';
};

export type VideoMetadata = {
  path: string;
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  sizeBytes: number;
  previewUrl?: string;
};

export const defaultSubtitleStyle = (): SubtitleStyle => ({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 56,
  fontWeight: 800,
  textColor: '#FFFFFF',
  boxColor: '#111827',
  boxOpacity: 0.88,
  paddingX: 28,
  paddingY: 16,
  borderRadius: 22,
  textAlign: 'center',
  animationPreset: 'pop',
  safeAreaX: 96,
  safeAreaBottom: 120,
  maxLines: 2,
});

export const normalizeSegmentsToCues = (segments: TranscriptSegment[]): Cue[] =>
  segments
    .filter((segment) => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.text.trim())
    .map((segment, index) => ({
      id: String(segment.id ?? index),
      startMs: Math.max(0, Math.round(segment.start * 1000)),
      endMs: Math.max(Math.round(segment.end * 1000), Math.round(segment.start * 1000) + 350),
      text: normalizeCueText(segment.text),
    }));

export const normalizeCueText = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();

export const updateCueText = (cues: Cue[], cueId: string, text: string): Cue[] =>
  cues.map((cue) => (cue.id === cueId ? {...cue, text: normalizeCueText(text)} : cue));

export const getActiveCue = (cues: Cue[], currentMs: number): Cue | null =>
  cues.find((cue) => currentMs >= cue.startMs && currentMs <= cue.endMs) ?? null;
