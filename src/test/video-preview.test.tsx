import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {VideoPreview} from '@renderer/components/VideoPreview';
import {defaultSubtitleStyle} from '@shared/subtitles';

const video = {
  path: '/tmp/video.mp4',
  previewUrl: 'http://127.0.0.1:9999/preview-video/test.mp4',
  width: 1080,
  height: 1920,
  fps: 30,
  durationSec: 8,
  sizeBytes: 1000,
};

const cues = [
  {id: 'a', startMs: 0, endMs: 1800, text: 'First subtitle'},
  {id: 'b', startMs: 2000, endMs: 4000, text: 'Second subtitle'},
];

describe('VideoPreview', () => {
  it('uses a native video element so playback time drives active captions', async () => {
    const {container} = render(
      <VideoPreview
        video={video}
        cues={cues}
        style={defaultSubtitleStyle()}
        onStyleChange={() => undefined}
      />,
    );

    const videoElement = container.querySelector('video');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement?.getAttribute('src')).toBe(video.previewUrl);

    await waitFor(() => expect(container.querySelector('.video-preview-subtitle')?.textContent).toContain('First subtitle'));

    Object.defineProperty(videoElement, 'currentTime', {value: 2.2, configurable: true});
    fireEvent.timeUpdate(videoElement as HTMLVideoElement);

    await waitFor(() => expect(container.querySelector('.video-preview-subtitle')?.textContent).toContain('Second subtitle'));
    expect(container.querySelector('.video-preview-subtitle')).toBeInTheDocument();
    expect(container.querySelectorAll('.subtitle-resize-handle')).toHaveLength(1);
  });
});
