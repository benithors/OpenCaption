// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {transcribeVideo, type OpenAiTranscriptionClient} from '../electron/transcription';
import {probeVideo} from '../electron/ffmpeg';
import path from 'node:path';

const fixturePath = path.resolve(process.cwd(), 'fixtures/generated/fixture-short.mp4');

describe('transcription service', () => {
  it('returns the mock transcript when no API key is supplied', async () => {
    const result = await transcribeVideo(fixturePath, {});
    expect(result.source).toBe('mock');
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.words.length).toBeGreaterThan(0);
  });

  it('requests word timestamps for whisper-1', async () => {
    const payloads: Record<string, unknown>[] = [];
    const clientFactory = (): OpenAiTranscriptionClient => ({
      audio: {
        transcriptions: {
          create: async (payload) => {
            payloads.push(payload);
            return {
              text: 'Hello world',
              segments: [{start: 0, end: 1, text: 'Hello world'}],
              words: [
                {word: 'Hello', start: 0, end: 0.4},
                {word: 'world', start: 0.4, end: 1},
              ],
            };
          },
        },
      },
    });

    const result = await transcribeVideo(fixturePath, {
      apiKey: 'test-key',
      clientFactory,
      thresholdBytes: Number.MAX_SAFE_INTEGER,
      model: 'whisper-1',
    });

    expect(payloads).toHaveLength(1);
    expect(payloads[0].response_format).toBe('verbose_json');
    expect(payloads[0].timestamp_granularities).toEqual(['segment', 'word']);
    expect(result.words).toEqual([
      {word: 'Hello', start: 0, end: 0.4},
      {word: 'world', start: 0.4, end: 1},
    ]);
  });

  it('offsets chunked transcription results', async () => {
    const calls: Array<{startText: string}> = [];
    const clientFactory = (): OpenAiTranscriptionClient => ({
      audio: {
        transcriptions: {
          create: async () => {
            const index = calls.length;
            calls.push({startText: `chunk-${index}`});
            return {
              segments: [{start: 0, end: 1, text: `chunk-${index}`}],
              words: [{word: `chunk-${index}`, start: 0, end: 1}],
            };
          },
        },
      },
    });

    const video = await probeVideo(fixturePath);
    const result = await transcribeVideo(fixturePath, {
      apiKey: 'test-key',
      clientFactory,
      thresholdBytes: 10,
      model: 'gpt-4o-mini-transcribe',
    });

    expect(result.source).toBe('openai');
    expect(result.segments.length).toBeGreaterThan(1);
    expect(result.segments[1].start).toBeGreaterThanOrEqual(1);
    expect(result.words.length).toBeGreaterThan(1);
    expect(result.words[1].start).toBeGreaterThanOrEqual(1);
    expect(video.durationSec).toBeGreaterThan(1);
  });
});
