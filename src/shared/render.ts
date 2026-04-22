import type {Cue, SubtitleStyle, VideoMetadata} from './subtitles';

export type RenderContract = {
  width: number;
  height: number;
  fps: number;
  style: SubtitleStyle;
  cues: Cue[];
  video: Pick<VideoMetadata, 'path' | 'durationSec' | 'width' | 'height'>;
};

export const defaultCompositionSize = {
  width: 1080,
  height: 1920,
  fps: 30,
};

export const getVideoDurationInFrames = (durationSec: number, fps: number) => Math.max(1, Math.ceil(durationSec * fps));

const scaleLength = (value: number, scale: number) => `${value * scale}px`;

export const getSubtitleBoxStyle = (style: SubtitleStyle, scale = 1) => ({
  color: style.textColor,
  backgroundColor: hexToRgba(style.boxColor, style.boxOpacity),
  borderRadius: scaleLength(style.borderRadius, scale),
  padding: `${scaleLength(style.paddingY, scale)} ${scaleLength(style.paddingX, scale)}`,
  fontFamily: style.fontFamily,
  fontSize: scaleLength(style.fontSize, scale),
  fontWeight: style.fontWeight,
  lineHeight: 1.08,
  textAlign: style.textAlign,
  maxWidth: `${style.maxWidth}%`,
  boxSizing: 'border-box' as const,
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
  overflowWrap: 'anywhere' as const,
});

export const getSubtitleShadow = (scale = 1, opacity = 0.35) =>
  `0 ${24 * scale}px ${50 * scale}px rgba(0, 0, 0, ${opacity})`;

export const hexToRgba = (hex: string, opacity: number) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};
