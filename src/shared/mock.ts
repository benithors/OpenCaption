import type {TranscriptionResult} from './subtitles';

export const mockTranscriptionResult = (): TranscriptionResult => ({
  source: 'mock',
  text: 'Hello from the subtitle app. This is a caption test. Edit the line and export the result.',
  segments: [
    {id: 'a', start: 0, end: 2.4, text: 'Hello from the subtitle app.'},
    {id: 'b', start: 2.5, end: 5.4, text: 'This is a caption test.'},
    {id: 'c', start: 5.5, end: 8.8, text: 'Edit the line and export the result.'},
  ],
});
