import React from 'react';
import {Composition} from 'remotion';
import {defaultSubtitleStyle} from '../shared/subtitles';
import {defaultCompositionSize} from '../shared/render';
import {SubtitleComposition} from './SubtitleComposition';
import type {SubtitleCompositionProps} from './types';

const defaultProps: SubtitleCompositionProps = {
  mode: 'render',
  videoPath: '',
  cues: [],
  style: defaultSubtitleStyle(),
  width: defaultCompositionSize.width,
  height: defaultCompositionSize.height,
  fps: defaultCompositionSize.fps,
  durationInFrames: 150,
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SubtitleComposition"
      component={SubtitleComposition}
      durationInFrames={defaultProps.durationInFrames}
      fps={defaultProps.fps}
      width={defaultProps.width}
      height={defaultProps.height}
      defaultProps={defaultProps}
      calculateMetadata={({props}: {props: SubtitleCompositionProps}) => ({
        durationInFrames: props.durationInFrames,
        fps: props.fps,
        width: props.width,
        height: props.height,
      })}
    />
  );
};
