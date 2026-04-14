import {describe, expect, it} from 'vitest';
import {defaultSubtitleStyle, normalizeSegmentsToCues, splitCueIntoWords, updateCueText} from '@shared/subtitles';
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

  it('uses transcript word timings when they line up with the cue text', () => {
    const [cue] = normalizeSegmentsToCues(
      [{start: 0, end: 1.2, text: 'Hello world!'}],
      [
        {word: 'Hello', start: 0, end: 0.45},
        {word: 'world', start: 0.45, end: 1.2},
      ],
    );

    expect(splitCueIntoWords(cue)).toEqual([
      {text: 'Hello', startMs: 0, endMs: 450},
      {text: 'world!', startMs: 450, endMs: 1200},
    ]);
  });

  it('keeps real word timings when neighboring segment words bleed into the overlap window', () => {
    const [cue] = normalizeSegmentsToCues(
      [{start: 6.86, end: 12.34, text: 'Was wir hier gerade erleben, ist die größte und chaotischste Veränderung der Softwareindustrie.'}],
      [
        {word: 'andauernd', start: 5.95, end: 6.88},
        {word: 'Was', start: 6.9, end: 7.02},
        {word: 'wir', start: 7.02, end: 7.18},
        {word: 'hier', start: 7.18, end: 7.4},
        {word: 'gerade', start: 7.4, end: 7.82},
        {word: 'erleben', start: 7.82, end: 8.3},
        {word: 'ist', start: 8.32, end: 8.54},
        {word: 'die', start: 8.54, end: 8.7},
        {word: 'größte', start: 8.7, end: 9.18},
        {word: 'und', start: 9.18, end: 9.38},
        {word: 'chaotischste', start: 9.38, end: 10.08},
        {word: 'Veränderung', start: 10.08, end: 10.82},
        {word: 'der', start: 10.82, end: 11.0},
        {word: 'Softwareindustrie', start: 11.0, end: 11.96},
        {word: 'Coding', start: 12.3, end: 12.6},
      ],
    );

    expect(splitCueIntoWords(cue).map((word) => word.text)).toEqual([
      'Was',
      'wir',
      'hier',
      'gerade',
      'erleben,',
      'ist',
      'die',
      'größte',
      'und',
      'chaotischste',
      'Veränderung',
      'der',
      'Softwareindustrie.',
    ]);
    expect(splitCueIntoWords(cue)[7]).toMatchObject({startMs: 8700, endMs: 9180});
  });

  it('keeps word timings after text edits when the word count stays the same', () => {
    const [cue] = normalizeSegmentsToCues(
      [{id: 'a', start: 0, end: 1.2, text: 'Hello world!'}],
      [
        {word: 'Hello', start: 0, end: 0.45},
        {word: 'world', start: 0.45, end: 1.2},
      ],
    );

    const [edited] = updateCueText([cue], 'a', 'Hello captions!');
    expect(splitCueIntoWords(edited)).toEqual([
      {text: 'Hello', startMs: 0, endMs: 450},
      {text: 'captions!', startMs: 450, endMs: 1200},
    ]);
  });

  it('falls back to synthetic word timings when the edit changes the word count', () => {
    const [cue] = normalizeSegmentsToCues(
      [{id: 'a', start: 0, end: 0.9, text: 'One two'}],
      [
        {word: 'One', start: 0, end: 0.3},
        {word: 'two', start: 0.3, end: 0.9},
      ],
    );

    const [edited] = updateCueText([cue], 'a', 'One two three');
    expect(splitCueIntoWords(edited)).toEqual([
      {text: 'One', startMs: 0, endMs: 300},
      {text: 'two', startMs: 300, endMs: 600},
      {text: 'three', startMs: 600, endMs: 900},
    ]);
  });

  it('shows the whole cue at segment timing when transcript words cannot be aligned reliably', () => {
    const [cue] = normalizeSegmentsToCues(
      [{start: 0, end: 1.2, text: 'Hello world'}],
      [
        {word: 'Different', start: 0, end: 0.6},
        {word: 'tokens', start: 0.6, end: 1.2},
      ],
    );

    expect(splitCueIntoWords(cue)).toEqual([
      {text: 'Hello world', startMs: 0, endMs: 1200},
    ]);
  });

  it('validates style bounds', () => {
    const style = defaultSubtitleStyle();
    expect(validateStyle(style)).toEqual([]);
    expect(style.fontSize).toBe(20);
    expect(validateStyle({...style, fontSize: 4})).toEqual([]);
    expect(validateStyle({...style, fontSize: -1})).toContain('fontSize must be non-negative');
    expect(validateStyle({...style, fontSize: 129})).toContain('fontSize must be at most 128');
  });
});
