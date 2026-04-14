import {describe, expect, it} from 'vitest';
import {getPreviewSubtitleBoxStyle} from '@shared/render';
import {defaultSubtitleStyle} from '@shared/subtitles';

describe('render helpers', () => {
  it('scales preview subtitle sizing to the preview container width', () => {
    const previewStyle = getPreviewSubtitleBoxStyle(defaultSubtitleStyle(), 1080);

    expect(previewStyle.fontSize).toBe('calc(20 * 100cqw / 1080)');
    expect(previewStyle.padding).toBe('calc(16 * 100cqw / 1080) calc(28 * 100cqw / 1080)');
    expect(previewStyle.borderRadius).toBe('calc(22 * 100cqw / 1080)');
  });
});
