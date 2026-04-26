import {describe, expect, it} from 'vitest';
import {defaultSubtitleStyle, normalizeSegmentsToCues, splitCueIntoWords, updateCueText} from '@shared/subtitles';
import {validateStyle} from '@shared/schema';

describe('subtitle domain', () => {
  it('normalizes transcript segments into cues when no timed words are supplied', () => {
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

  it('builds subtitle cues directly from real timed words', () => {
    const cues = normalizeSegmentsToCues(
      [{start: 0, end: 1.2, text: 'Completely different segment text'}],
      [
        {word: 'One', start: 0, end: 0.2},
        {word: 'two', start: 0.2, end: 0.4},
        {word: 'three', start: 0.4, end: 0.6},
        {word: 'four', start: 0.6, end: 0.8},
        {word: 'five', start: 0.8, end: 1.0},
        {word: 'six', start: 1.0, end: 1.2},
      ],
    );

    expect(cues.map((cue) => ({
      text: cue.text,
      startMs: cue.startMs,
      endMs: cue.endMs,
      wordTimingSource: cue.wordTimingSource,
      wordCount: cue.words?.length,
    }))).toEqual([
      {text: 'One two three four', startMs: 0, endMs: 800, wordTimingSource: 'timed', wordCount: 4},
      {text: 'five six', startMs: 800, endMs: 1200, wordTimingSource: 'timed', wordCount: 2},
    ]);

    expect(splitCueIntoWords(cues[0])).toEqual([
      {text: 'One', startMs: 0, endMs: 200},
      {text: 'two', startMs: 200, endMs: 400},
      {text: 'three', startMs: 400, endMs: 600},
      {text: 'four', startMs: 600, endMs: 800},
    ]);
  });

  it('restores punctuation from segment text and starts a new cue for the next sentence', () => {
    const cues = normalizeSegmentsToCues(
      [{start: 0, end: 1.1, text: 'Good day. Hi there.'}],
      [
        {word: 'Good', start: 0, end: 0.25},
        {word: 'day', start: 0.25, end: 0.5},
        {word: 'Hi', start: 0.6, end: 0.8},
        {word: 'there', start: 0.8, end: 1.1},
      ],
    );

    expect(cues.map((cue) => cue.text)).toEqual(['Good day.', 'Hi there.']);
    expect(splitCueIntoWords(cues[0])).toEqual([
      {text: 'Good', startMs: 0, endMs: 250},
      {text: 'day.', startMs: 250, endMs: 500},
    ]);
    expect(splitCueIntoWords(cues[1])).toEqual([
      {text: 'Hi', startMs: 600, endMs: 800},
      {text: 'there.', startMs: 800, endMs: 1100},
    ]);
  });

  it('keeps real word timings after text edits when the word count stays the same', () => {
    const [cue] = normalizeSegmentsToCues(
      [{id: 'a', start: 0, end: 0.9, text: 'One two'}],
      [
        {word: 'One', start: 0, end: 0.3},
        {word: 'two', start: 0.3, end: 0.9},
      ],
    );

    const [edited] = updateCueText([cue], cue.id, 'One three');
    expect(splitCueIntoWords(edited)).toEqual([
      {text: 'One', startMs: 0, endMs: 300},
      {text: 'three', startMs: 300, endMs: 900},
    ]);
  });

  it('stops word-by-word highlighting instead of guessing timings after word-count edits', () => {
    const [cue] = normalizeSegmentsToCues(
      [{id: 'a', start: 0, end: 0.9, text: 'One two'}],
      [
        {word: 'One', start: 0, end: 0.3},
        {word: 'two', start: 0.3, end: 0.9},
      ],
    );

    const [edited] = updateCueText([cue], cue.id, 'One two three');
    expect(splitCueIntoWords(edited)).toEqual([
      {text: 'One two three', startMs: 0, endMs: 900},
    ]);
  });

  it('validates style bounds', () => {
    const style = defaultSubtitleStyle();
    expect(validateStyle(style)).toEqual([]);
    expect(style.fontSize).toBe(20);
    expect(validateStyle({...style, fontSize: 4})).toEqual([]);
    expect(validateStyle({...style, fontSize: -1})).toContain('fontSize must be at least 4');
    expect(validateStyle({...style, fontSize: 129})).toContain('fontSize must be at most 128');
  });
});
