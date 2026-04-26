import React from 'react';
import {AbsoluteFill, Html5Video, OffthreadVideo, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {chunkWords, getActiveChunk, getActiveCue, splitCueIntoWords} from '../shared/subtitles';
import {getSubtitleBoxStyle, getSubtitleShadow, hexToRgba} from '../shared/render';
import type {SubtitleCompositionProps} from './types';

export const SubtitleComposition: React.FC<SubtitleCompositionProps> = ({
  mode,
  videoPath,
  cues,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const cue = getActiveCue(cues, currentMs);
  const activeChunk = cue ? getActiveChunk(chunkWords(splitCueIntoWords(cue)), currentMs) : null;
  const boxStyle = getSubtitleBoxStyle(style);
  const entryFrame = activeChunk ? Math.max(0, frame - Math.round((activeChunk[0].startMs / 1000) * fps)) : 0;

  const activeScale = spring({
    fps,
    frame: entryFrame,
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
      <AbsoluteFill>
        {activeChunk ? (
          <div
            data-caption-box="true"
            style={{
              ...boxStyle,
              color: undefined,
              display: 'inline-flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              position: 'absolute',
              left: `${style.positionX}%`,
              top: `${style.positionY}%`,
              transform: `translate(-50%, -50%) scale(${interpolate(activeScale, [0, 1], [0.95, 1])})`,
              boxShadow: getSubtitleShadow(),
              letterSpacing: '-0.03em',
            }}
          >
            {activeChunk.map((word, index) => (
              <span
                key={`${word.startMs}-${index}`}
                style={{color: currentMs >= word.startMs ? style.textColor : hexToRgba(style.textColor, 0.22)}}
              >
                {index > 0 ? ' ' : ''}{word.text}
              </span>
            ))}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
