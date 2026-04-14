import type {TranscriptionResult} from './subtitles';

export const mockTranscriptionResult = (): TranscriptionResult => ({
  source: 'mock',
  text: 'Hello from the subtitle app. This is a caption test. Edit the line and export the result.',
  words: [
    {word: 'Hello', start: 0.0, end: 0.35},
    {word: 'from', start: 0.35, end: 0.6},
    {word: 'the', start: 0.6, end: 0.8},
    {word: 'subtitle', start: 0.8, end: 1.35},
    {word: 'app.', start: 1.35, end: 2.4},
    {word: 'This', start: 2.5, end: 2.8},
    {word: 'is', start: 2.8, end: 3.0},
    {word: 'a', start: 3.0, end: 3.12},
    {word: 'caption', start: 3.12, end: 3.72},
    {word: 'test.', start: 3.72, end: 5.4},
    {word: 'Edit', start: 5.5, end: 5.95},
    {word: 'the', start: 5.95, end: 6.18},
    {word: 'line', start: 6.18, end: 6.6},
    {word: 'and', start: 6.6, end: 6.9},
    {word: 'export', start: 6.9, end: 7.55},
    {word: 'the', start: 7.55, end: 7.78},
    {word: 'result.', start: 7.78, end: 8.8},
  ],
  segments: [
    {id: 'a', start: 0, end: 2.4, text: 'Hello from the subtitle app.'},
    {id: 'b', start: 2.5, end: 5.4, text: 'This is a caption test.'},
    {id: 'c', start: 5.5, end: 8.8, text: 'Edit the line and export the result.'},
  ],
});
