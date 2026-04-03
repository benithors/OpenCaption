import {describe, expect, it} from 'vitest';
import {defaultSubtitleStyle, normalizeSegmentsToCues, updateCueText} from '@shared/subtitles';
import {validateStyle} from '@shared/schema';

describe('subtitle domain', () => {
  it('normalizes transcript segments into cues', () => {
    const cues = normalizeSegmentsToCues([
      {start: 0, end: 1.2, text: ' Hello   world ! '},
      {start: 2.1, end: 2.4, text: 'Second line'},
    ]);

    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({startMs: 0, endMs: 1200, text: 'Hello world!'});
    expect(cues[1].endMs).toBeGreaterThan(cues[1].startMs);
  });

  it('updates only the targeted cue text', () => {
    const cues = normalizeSegmentsToCues([
      {id: 'a', start: 0, end: 1, text: 'One'},
      {id: 'b', start: 1, end: 2, text: 'Two'},
    ]);

    const updated = updateCueText(cues, 'b', ' updated   text ');
    expect(updated[0].text).toBe('One');
    expect(updated[1].text).toBe('updated text');
  });

  it('validates style bounds', () => {
    const style = defaultSubtitleStyle();
    expect(validateStyle(style)).toEqual([]);
    expect(validateStyle({...style, fontSize: 4})).toContain('fontSize must be between 24 and 128');
  });
});
