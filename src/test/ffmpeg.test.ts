// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {parseFrameRate} from '../electron/ffmpeg';

describe('ffmpeg metadata helpers', () => {
  it('prefers the average frame rate so subtitle timing follows playback time', () => {
    expect(parseFrameRate('30000/1001', '90000/1')).toBeCloseTo(29.97, 2);
  });

  it('falls back when ffprobe reports an unusable or timebase-like frame rate', () => {
    expect(parseFrameRate('0/0', '90000/1')).toBe(30);
    expect(parseFrameRate(undefined, '24000/1001')).toBeCloseTo(23.98, 2);
  });
});
