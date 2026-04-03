import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {bundle} from '@remotion/bundler';
import type {Cue, SubtitleStyle, VideoMetadata} from '@shared/subtitles';
import {defaultCompositionSize, getVideoDurationInFrames} from '@shared/render';

const entryPoint = path.resolve(process.cwd(), 'src/remotion/index.ts');
let cachedServeUrl: string | null = null;

const findPrebuiltBundle = () => {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), 'dist-remotion'),
    path.resolve(moduleDir, '../../dist-remotion'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
};

const ensureBundle = async () => {
  if (cachedServeUrl) return cachedServeUrl;

  const prebuiltBundle = process.env.REMOTION_USE_PREBUILT_BUNDLE === '1' ? findPrebuiltBundle() : undefined;
  if (prebuiltBundle) {
    cachedServeUrl = prebuiltBundle;
    return cachedServeUrl;
  }

  cachedServeUrl = await bundle({entryPoint, enableCaching: true});
  return cachedServeUrl;
};

export type ExportPayload = {
  video: VideoMetadata;
  cues: Cue[];
  style: SubtitleStyle;
  outputPath: string;
};

const mimeTypeForPath = (videoPath: string) => {
  const extension = path.extname(videoPath).toLowerCase();
  switch (extension) {
    case '.mov':
      return 'video/quicktime';
    case '.m4v':
      return 'video/x-m4v';
    case '.webm':
      return 'video/webm';
    case '.mp4':
    default:
      return 'video/mp4';
  }
};

const withServedVideoUrl = async <T>(videoPath: string, callback: (videoUrl: string) => Promise<T>): Promise<T> => {
  const fileStats = await stat(videoPath);
  const assetPath = `/asset${path.extname(videoPath).toLowerCase() || '.mp4'}`;
  const mimeType = mimeTypeForPath(videoPath);
  const server = http.createServer((request, response) => {
    if (request.url !== assetPath) {
      response.statusCode = 404;
      response.end('Not found');
      return;
    }

    const range = request.headers.range;
    if (!range) {
      response.writeHead(200, {
        'Content-Length': fileStats.size,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(videoPath).pipe(response);
      return;
    }

    const [startValue, endValue] = range.replace(/bytes=/, '').split('-');
    const start = Number.parseInt(startValue, 10);
    const end = endValue ? Number.parseInt(endValue, 10) : fileStats.size - 1;
    response.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileStats.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': mimeType,
    });
    fs.createReadStream(videoPath, {start, end}).pipe(response);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not start local asset server');
  }

  try {
    return await callback(`http://127.0.0.1:${address.port}${assetPath}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
};

export const exportSubtitledVideo = async ({video, cues, style, outputPath}: ExportPayload) => {
  const serveUrl = await ensureBundle();
  await withServedVideoUrl(video.path, async (videoUrl) => {
    const inputProps = {
      mode: 'render' as const,
      videoPath: videoUrl,
      cues,
      style,
      width: video.width || defaultCompositionSize.width,
      height: video.height || defaultCompositionSize.height,
      fps: video.fps || defaultCompositionSize.fps,
      durationInFrames: getVideoDurationInFrames(video.durationSec, video.fps || defaultCompositionSize.fps),
    };

    const composition = await selectComposition({
      serveUrl,
      id: 'SubtitleComposition',
      inputProps,
    });

    await renderMedia({
      codec: 'h264',
      serveUrl,
      composition,
      inputProps,
      outputLocation: outputPath,
      chromiumOptions: {
        disableWebSecurity: false,
      },
    });
  });

  return outputPath;
};
