import React from 'react';
import {AbsoluteFill, Html5Video, OffthreadVideo, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Cue} from '../shared/subtitles';
import {getSubtitleBoxStyle} from '../shared/render';
import type {SubtitleCompositionProps} from './types';

const activeCueForFrame = (cues: Cue[], frame: number, fps: number) => {
  const currentMs = (frame / fps) * 1000;
  return cues.find((cue) => currentMs >= cue.startMs && currentMs <= cue.endMs) ?? null;
};

export const SubtitleComposition: React.FC<SubtitleCompositionProps> = ({
  mode,
  videoPath,
  cues,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cue = activeCueForFrame(cues, frame, fps);
  const boxStyle = getSubtitleBoxStyle(style);

  const activeScale = spring({
    fps,
    frame,
    config: {
      damping: 14,
      stiffness: 180,
      mass: 0.8,
    },
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#050816'}}>
      {mode === 'render' ? (
        <OffthreadVideo src={videoPath} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      ) : (
        <Html5Video src={videoPath} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      )}
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: style.safeAreaBottom}}>
        {cue ? (
          <div
            style={{
              ...boxStyle,
              transform: `scale(${interpolate(activeScale, [0, 1], [0.95, 1])})`,
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.35)',
              letterSpacing: '-0.03em',
            }}
          >
            {cue.text}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
