import fs from 'node:fs';
import {rm} from 'node:fs/promises';
import OpenAI from 'openai';
import {buildChunkPlanForExtractedAudio, createTempWorkspace, extractAudioChunk, extractAudioForTranscription, probeVideo} from './ffmpeg';
import type {TranscriptSegment, TranscriptWord, TranscriptionResult} from '@shared/subtitles';
import {mockTranscriptionResult} from '@shared/mock';

export type OpenAiTranscriptionClient = {
  audio: {
    transcriptions: {
      create: (payload: Record<string, unknown>) => Promise<{text?: string; segments?: TranscriptSegment[]; words?: TranscriptWord[]}>;
    };
  };
};

export type TranscriptionOptions = {
  apiKey?: string;
  model?: string;
  thresholdBytes?: number;
  clientFactory?: (apiKey: string) => OpenAiTranscriptionClient;
};

const defaultClientFactory = (apiKey: string): OpenAiTranscriptionClient => new OpenAI({apiKey}) as unknown as OpenAiTranscriptionClient;

const fallbackSegmentsFromText = (text: string, offsetSec: number, durationSec: number): TranscriptSegment[] => {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const parts = sentences.length > 0 ? sentences : [normalized];
  const segmentDuration = Math.max(durationSec / parts.length, 0.6);

  return parts.map((part, index) => {
    const start = offsetSec + index * segmentDuration;
    const end = index === parts.length - 1 ? offsetSec + durationSec : start + segmentDuration;
    return {
      id: `${offsetSec}-${index}`,
      start,
      end,
      text: part,
    };
  });
};

const offsetWords = (words: TranscriptWord[], offsetSec: number): TranscriptWord[] =>
  words.map((word) => ({
    word: word.word,
    start: word.start + offsetSec,
    end: word.end + offsetSec,
  }));

const transcribeSingleFile = async (
  client: OpenAiTranscriptionClient,
  filePath: string,
  offsetSec = 0,
  durationSec: number,
  model = 'whisper-1',
): Promise<{segments: TranscriptSegment[]; words: TranscriptWord[]}> => {
  const supportsWordTimestamps = model === 'whisper-1';
  const payload: Record<string, unknown> = {
    file: fs.createReadStream(filePath),
    model,
  };

  if (supportsWordTimestamps) {
    payload.response_format = 'verbose_json';
    payload.timestamp_granularities = ['segment', 'word'];
  } else {
    payload.response_format = 'json';
  }

  const response = (await client.audio.transcriptions.create(payload)) as {
    text?: string;
    segments?: TranscriptSegment[];
    words?: TranscriptWord[];
  };

  const segments = Array.isArray(response.segments) ? response.segments : [];
  const words = Array.isArray(response.words) ? response.words : [];
  if (segments.length === 0) {
    return {
      segments: fallbackSegmentsFromText(response.text ?? '', offsetSec, durationSec),
      words: [],
    };
  }

  return {
    segments: segments.map((segment, index) => ({
      id: segment.id ?? `${offsetSec}-${index}`,
      start: segment.start + offsetSec,
      end: segment.end + offsetSec,
      text: segment.text,
    })),
    words: offsetWords(words, offsetSec),
  };
};

export const transcribeVideo = async (videoPath: string, options: TranscriptionOptions = {}): Promise<TranscriptionResult> => {
  const {
    apiKey,
    model = 'whisper-1',
    thresholdBytes,
    clientFactory = defaultClientFactory,
  } = options;

  if (!apiKey?.trim()) {
    return mockTranscriptionResult();
  }

  const video = await probeVideo(videoPath);
  const workDir = await createTempWorkspace();

  try {
    const extracted = await extractAudioForTranscription(videoPath, workDir);
    const chunkPlan = await buildChunkPlanForExtractedAudio(extracted.outputPath, video.durationSec, thresholdBytes);
    const client = clientFactory(apiKey);

    const allSegments: TranscriptSegment[] = [];
    const allWords: TranscriptWord[] = [];

    for (const [index, chunk] of chunkPlan.chunks.entries()) {
      const filePath = chunkPlan.shouldChunk
        ? (await extractAudioChunk(extracted.outputPath, workDir, chunk.startSec, chunk.durationSec, index)).outputPath
        : extracted.outputPath;
      const {segments, words} = await transcribeSingleFile(client, filePath, chunk.startSec, chunk.durationSec, model);
      allSegments.push(...segments);
      allWords.push(...words);
    }

    return {
      source: 'openai',
      text: allSegments.map((segment) => segment.text).join(' ').trim(),
      segments: allSegments,
      words: allWords,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Transcription failed: ${message}`);
  } finally {
    await rm(workDir, {recursive: true, force: true});
  }
};
