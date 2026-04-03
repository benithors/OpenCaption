import {mkdtemp, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {VideoMetadata} from '@shared/subtitles';
import {planAudioChunks, type ChunkPlan} from '@shared/chunking';

const execFileAsync = promisify(execFile);

const parseFrameRate = (value?: string) => {
  if (!value || value === '0/0') return 30;
  const [numerator, denominator] = value.split('/').map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 30;
  return numerator / denominator;
};

export const probeVideo = async (videoPath: string): Promise<VideoMetadata> => {
  const {stdout} = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,r_frame_rate:format=duration,size',
    '-of',
    'json',
    videoPath,
  ]);

  const parsed = JSON.parse(stdout) as {
    streams?: Array<{width?: number; height?: number; r_frame_rate?: string}>;
    format?: {duration?: string; size?: string};
  };

  const stream = parsed.streams?.[0] ?? {};
  const durationSec = Number(parsed.format?.duration ?? 0);
  const fileSize = Number(parsed.format?.size ?? (await stat(videoPath)).size);

  return {
    path: videoPath,
    width: stream.width ?? 1080,
    height: stream.height ?? 1920,
    fps: parseFrameRate(stream.r_frame_rate),
    durationSec,
    sizeBytes: fileSize,
  };
};

export const createTempWorkspace = async () => mkdtemp(path.join(tmpdir(), 'social-subtitles-'));

export const extractAudioForTranscription = async (videoPath: string, workDir: string) => {
  const outputPath = path.join(workDir, 'transcription-audio.mp3');
  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    videoPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-b:a',
    '64k',
    outputPath,
  ]);
  const fileStats = await stat(outputPath);
  return {outputPath, sizeBytes: fileStats.size};
};

export const extractAudioChunk = async (
  audioPath: string,
  workDir: string,
  startSec: number,
  durationSec: number,
  chunkIndex: number,
) => {
  const outputPath = path.join(workDir, `chunk-${chunkIndex}.mp3`);
  await execFileAsync('ffmpeg', [
    '-y',
    '-ss',
    `${startSec}`,
    '-t',
    `${durationSec}`,
    '-i',
    audioPath,
    '-ac',
    '1',
    '-ar',
    '16000',
    '-b:a',
    '64k',
    outputPath,
  ]);
  const fileStats = await stat(outputPath);
  return {outputPath, sizeBytes: fileStats.size};
};

export const buildChunkPlanForExtractedAudio = async (
  audioPath: string,
  durationSec: number,
  thresholdBytes?: number,
): Promise<ChunkPlan> => {
  const fileStats = await stat(audioPath);
  return planAudioChunks({
    fileSizeBytes: fileStats.size,
    durationSec,
    thresholdBytes,
  });
};
