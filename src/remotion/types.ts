import type {Cue, SubtitleStyle} from '../shared/subtitles';

export type SubtitleCompositionProps = {
  mode: 'preview' | 'render';
  videoPath: string;
  cues: Cue[];
  style: SubtitleStyle;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
};
