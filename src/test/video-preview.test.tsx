import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {VideoPreview} from '@renderer/components/VideoPreview';
import {defaultSubtitleStyle} from '@shared/subtitles';

describe('VideoPreview', () => {
  it('shows the active cue while the video time is within the cue range', () => {
    render(
      <VideoPreview
        video={{
          path: '/tmp/video.mp4',
          previewUrl: 'http://127.0.0.1:9999/preview-video/test.mp4',
          width: 1080,
          height: 1920,
          fps: 30,
          durationSec: 8,
          sizeBytes: 1000,
        }}
        cues={[
          {id: 'a', startMs: 0, endMs: 1800, text: 'First subtitle'},
          {id: 'b', startMs: 2000, endMs: 4000, text: 'Second subtitle'},
        ]}
        style={defaultSubtitleStyle()}
      />,
    );

    const video = document.querySelector('video') as HTMLVideoElement;
    fireEvent.timeUpdate(video, {target: {currentTime: 0.8}});
    expect(screen.getByText('First subtitle')).toBeInTheDocument();

    fireEvent.timeUpdate(video, {target: {currentTime: 2.4}});
    expect(screen.getByText('Second subtitle')).toBeInTheDocument();
  });
});
