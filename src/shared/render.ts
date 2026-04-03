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

export const getSubtitleBoxStyle = (style: SubtitleStyle) => ({
  color: style.textColor,
  backgroundColor: hexToRgba(style.boxColor, style.boxOpacity),
  borderRadius: style.borderRadius,
  padding: `${style.paddingY}px ${style.paddingX}px`,
  fontFamily: style.fontFamily,
  fontSize: style.fontSize,
  fontWeight: style.fontWeight,
  lineHeight: 1.08,
  textAlign: style.textAlign,
  maxWidth: `calc(100% - ${style.safeAreaX * 2}px)`,
  boxSizing: 'border-box' as const,
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
  overflowWrap: 'anywhere' as const,
});

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
