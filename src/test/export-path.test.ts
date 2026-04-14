// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {getDefaultExportFilename, getDefaultExportPath} from '../electron/export-path';

describe('export path defaults', () => {
  it('uses the source video name with a _subtitled suffix', () => {
    expect(getDefaultExportFilename('/videos/intro_short_169.mp4')).toBe('intro_short_169_subtitled.mp4');
  });

  it('does not duplicate the _subtitled suffix', () => {
    expect(getDefaultExportFilename('/videos/intro_short_169_subtitled.mov')).toBe('intro_short_169_subtitled.mp4');
  });

  it('prefers the last export directory over the source video directory', () => {
    expect(getDefaultExportPath('/videos/intro_short_169.mp4', '/exports/final', '/Documents')).toBe('/exports/final/intro_short_169_subtitled.mp4');
  });

  it('falls back to the source video directory when no prior export directory exists', () => {
    expect(getDefaultExportPath('/videos/intro_short_169.mp4', undefined, '/Documents')).toBe('/videos/intro_short_169_subtitled.mp4');
  });
});
