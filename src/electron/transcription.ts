import fs from 'node:fs';
import {rm} from 'node:fs/promises';
import OpenAI from 'openai';
import {buildChunkPlanForExtractedAudio, createTempWorkspace, extractAudioChunk, extractAudioForTranscription, probeVideo} from './ffmpeg';
import type {TranscriptSegment, TranscriptionResult} from '@shared/subtitles';
import {mockTranscriptionResult} from '@shared/mock';

export type OpenAiTranscriptionClient = {
  audio: {
    transcriptions: {
      create: (payload: Record<string, unknown>) => Promise<{text?: string; segments?: TranscriptSegment[]}>;
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

const transcribeSingleFile = async (
  client: OpenAiTranscriptionClient,
  filePath: string,
  offsetSec = 0,
  durationSec: number,
  model = 'whisper-1',
): Promise<TranscriptSegment[]> => {
  const response = (await client.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model,
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  })) as {text?: string; segments?: TranscriptSegment[]};

  const segments = Array.isArray(response.segments) ? response.segments : [];
  if (segments.length === 0) {
    return fallbackSegmentsFromText(response.text ?? '', offsetSec, durationSec);
  }

  return segments.map((segment, index) => ({
    id: segment.id ?? `${offsetSec}-${index}`,
    start: segment.start + offsetSec,
    end: segment.end + offsetSec,
    text: segment.text,
  }));
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

    for (const [index, chunk] of chunkPlan.chunks.entries()) {
      const filePath = chunkPlan.shouldChunk
        ? (await extractAudioChunk(extracted.outputPath, workDir, chunk.startSec, chunk.durationSec, index)).outputPath
        : extracted.outputPath;
      const segments = await transcribeSingleFile(client, filePath, chunk.startSec, chunk.durationSec, model);
      allSegments.push(...segments);
    }

    return {
      source: 'openai',
      text: allSegments.map((segment) => segment.text).join(' ').trim(),
      segments: allSegments,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Transcription failed: ${message}`);
  } finally {
    await rm(workDir, {recursive: true, force: true});
  }
};
