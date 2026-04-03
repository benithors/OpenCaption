import {randomUUID} from 'node:crypto';

export type ChunkPlan = {
  shouldChunk: boolean;
  thresholdBytes: number;
  estimatedChunkCount: number;
  chunkDurationSec: number;
  chunks: Array<{
    id: string;
    startSec: number;
    durationSec: number;
  }>;
};

export type ChunkPlannerInput = {
  fileSizeBytes: number;
  durationSec: number;
  thresholdBytes?: number;
  targetChunkCount?: number;
};

export const OPENAI_TRANSCRIPTION_FILE_LIMIT_BYTES = 25 * 1024 * 1024;

export const planAudioChunks = ({
  fileSizeBytes,
  durationSec,
  thresholdBytes = OPENAI_TRANSCRIPTION_FILE_LIMIT_BYTES,
  targetChunkCount,
}: ChunkPlannerInput): ChunkPlan => {
  const safeDuration = Math.max(durationSec, 1);
  const shouldChunk = fileSizeBytes > thresholdBytes;

  if (!shouldChunk) {
    return {
      shouldChunk,
      thresholdBytes,
      estimatedChunkCount: 1,
      chunkDurationSec: safeDuration,
      chunks: [{id: randomUUID(), startSec: 0, durationSec: safeDuration}],
    };
  }

  const rawCount = targetChunkCount ?? Math.ceil(fileSizeBytes / (thresholdBytes * 0.82));
  const estimatedChunkCount = Math.max(rawCount, 2);
  const chunkDurationSec = Math.max(Math.ceil(safeDuration / estimatedChunkCount), 1);
  const chunks = Array.from({length: estimatedChunkCount}, (_, index) => {
    const startSec = index * chunkDurationSec;
    return {
      id: randomUUID(),
      startSec,
      durationSec: index === estimatedChunkCount - 1 ? Math.max(safeDuration - startSec, 1) : chunkDurationSec,
    };
  }).filter((chunk) => chunk.startSec < safeDuration);

  return {
    shouldChunk,
    thresholdBytes,
    estimatedChunkCount: chunks.length,
    chunkDurationSec,
    chunks,
  };
};
