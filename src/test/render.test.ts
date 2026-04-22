import {describe, expect, it} from 'vitest';
import {getSubtitleBoxStyle, getSubtitleShadow} from '@shared/render';
import {defaultSubtitleStyle} from '@shared/subtitles';

describe('render helpers', () => {
  it('uses render metrics unchanged at scale 1', () => {
    const style = getSubtitleBoxStyle(defaultSubtitleStyle());

    expect(style.fontSize).toBe('20px');
    expect(style.padding).toBe('16px 28px');
    expect(style.borderRadius).toBe('22px');
  });

  it('scales preview subtitle sizing from the same render metrics', () => {
    const previewScale = 420 / 1080;
    const style = getSubtitleBoxStyle(defaultSubtitleStyle(), previewScale);

    expect(style.fontSize).toBe(`${20 * previewScale}px`);
    expect(style.padding).toBe(`${16 * previewScale}px ${28 * previewScale}px`);
    expect(style.borderRadius).toBe(`${22 * previewScale}px`);
    expect(getSubtitleShadow(previewScale, 0.12)).toBe(`0 ${24 * previewScale}px ${50 * previewScale}px rgba(0, 0, 0, 0.12)`);
  });
});
