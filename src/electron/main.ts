import {app, BrowserWindow, dialog, ipcMain, safeStorage} from 'electron';
import {randomUUID} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import {loadSettings, saveSettings} from './settings-store';
import {probeVideo} from './ffmpeg';
import {transcribeVideo} from './transcription';
import {exportSubtitledVideo} from './export-video';
import type {SaveApiKeyPayload, SubtitleExportPayload} from '@shared/ipc';
import type {SettingsDocument} from './settings-store';
import {defaultSubtitleStyle, normalizeSegmentsToCues} from '@shared/subtitles';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let staticServerUrl: string | null = null;
const previewVideoRegistry = new Map<string, string>();

const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');

const getStoredApiKey = (settings: SettingsDocument) => {
  if (settings.apiKeyCiphertextBase64 && safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(settings.apiKeyCiphertextBase64, 'base64'));
  }

  return settings.apiKeyPlaintext ?? '';
};

const setStoredApiKey = (settings: SettingsDocument, apiKey: string) => {
  delete settings.apiKeyCiphertextBase64;
  delete settings.apiKeyPlaintext;

  if (!apiKey) {
    return settings;
  }

  if (safeStorage.isEncryptionAvailable()) {
    settings.apiKeyCiphertextBase64 = safeStorage.encryptString(apiKey).toString('base64');
    return settings;
  }

  settings.apiKeyPlaintext = apiKey;
  return settings;
};

const runSmokeModeIfConfigured = async () => {
  const inputPath = process.env.SOCIAL_SUBTITLE_SMOKE_INPUT;
  if (!inputPath) {
    return false;
  }

  const outputPath = process.env.SOCIAL_SUBTITLE_SMOKE_OUTPUT || path.join(app.getPath('documents'), 'social-subtitle-smoke.mp4');
  const reportPath = process.env.SOCIAL_SUBTITLE_SMOKE_REPORT;
  const apiKey = process.env.OPENAI_API_KEY;

  try {
    const video = await probeVideo(inputPath);
    const startedAt = Date.now();
    const transcription = await transcribeVideo(inputPath, {apiKey});
    const cues = normalizeSegmentsToCues(transcription.segments);
    const exportLocation = await exportSubtitledVideo({
      video,
      cues,
      style: defaultSubtitleStyle(),
      outputPath,
    });

    if (reportPath) {
      await mkdir(path.dirname(reportPath), {recursive: true});
      await writeFile(
        reportPath,
        JSON.stringify(
          {
            inputPath,
            outputPath: exportLocation,
            transcriptSource: transcription.source,
            cueCount: cues.length,
            durationSec: video.durationSec,
            exportDurationMs: Date.now() - startedAt,
          },
          null,
          2,
        ),
        'utf8',
      );
    }

    app.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    if (reportPath) {
      await mkdir(path.dirname(reportPath), {recursive: true});
      await writeFile(reportPath, JSON.stringify({inputPath, outputPath, error: message}, null, 2), 'utf8');
    }
    app.exit(1);
  }

  return true;
};

const mimeTypeForAsset = (filePath: string) => {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
};

const mimeTypeForVideo = (videoPath: string) => {
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

const registerPreviewVideo = async (videoPath: string) => {
  const baseUrl = await ensureStaticServer();
  for (const [id, existingPath] of previewVideoRegistry.entries()) {
    if (existingPath === videoPath) {
      return `${baseUrl}/preview-video/${id}${path.extname(videoPath).toLowerCase()}`;
    }
  }

  const id = randomUUID();
  previewVideoRegistry.set(id, videoPath);
  return `${baseUrl}/preview-video/${id}${path.extname(videoPath).toLowerCase()}`;
};

const ensureStaticServer = async () => {
  if (staticServerUrl) {
    return staticServerUrl;
  }

  const distDir = path.join(app.getAppPath(), 'dist');
  const server = http.createServer((request, response) => {
    const requestPath = request.url === '/' ? '/index.html' : request.url ?? '/index.html';
    if (requestPath.startsWith('/preview-video/')) {
      const id = requestPath.split('/')[2]?.split('.')[0] ?? '';
      const videoPath = previewVideoRegistry.get(id);
      if (!videoPath || !fs.existsSync(videoPath)) {
        response.statusCode = 404;
        response.end('Not found');
        return;
      }

      const fileStats = fs.statSync(videoPath);
      const mimeType = mimeTypeForVideo(videoPath);
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
      return;
    }

    const filePath = path.join(distDir, decodeURIComponent(requestPath.replace(/^\/+/, '')));

    if (!filePath.startsWith(distDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.statusCode = 404;
      response.end('Not found');
      return;
    }

    response.writeHead(200, {'Content-Type': mimeTypeForAsset(filePath)});
    fs.createReadStream(filePath).pipe(response);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not start static asset server');
  }

  staticServerUrl = `http://127.0.0.1:${address.port}`;
  return staticServerUrl;
};

const createMainWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1200,
    minHeight: 820,
    title: 'Social Subtitle Mac App',
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({mode: 'detach'});
  } else {
    const url = await ensureStaticServer();
    await mainWindow.loadURL(`${url}/index.html`);
  }
};

const registerHandlers = () => {
  ipcMain.handle('video:import', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          name: 'Video',
          extensions: ['mp4', 'mov'],
        },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return {canceled: true};
    }

    const video = await probeVideo(result.filePaths[0]);
    video.previewUrl = await registerPreviewVideo(video.path);
    return {canceled: false, video};
  });

  ipcMain.handle('video:get-preview-url', async (_event, payload: {videoPath: string}) => {
    return registerPreviewVideo(payload.videoPath);
  });

  ipcMain.handle('settings:get-api-key', async () => {
    const settings = await loadSettings(settingsPath());
    return getStoredApiKey(settings);
  });

  ipcMain.handle('settings:save-api-key', async (_event, payload: SaveApiKeyPayload) => {
    const settings = await loadSettings(settingsPath());
    setStoredApiKey(settings, payload.apiKey);
    await saveSettings(settingsPath(), settings);
  });

  ipcMain.handle('transcription:run', async (_event, payload: {videoPath: string; apiKey?: string}) => {
    const settings = await loadSettings(settingsPath());
    return transcribeVideo(payload.videoPath, {apiKey: payload.apiKey || getStoredApiKey(settings)});
  });

  ipcMain.handle('export:video', async (_event, payload: SubtitleExportPayload) => {
    const result = await dialog.showSaveDialog({
      title: 'Export subtitled video',
      defaultPath: path.join(app.getPath('documents'), 'subtitled-video.mp4'),
      filters: [{name: 'MP4 Video', extensions: ['mp4']}],
    });

    if (result.canceled || !result.filePath) {
      return {canceled: true};
    }

    await exportSubtitledVideo({
      video: payload.video,
      cues: payload.cues,
      style: payload.style,
      outputPath: result.filePath,
    });

    return {canceled: false, outputPath: result.filePath};
  });
};

app.whenReady().then(async () => {
  if (!isDev) {
    process.env.REMOTION_USE_PREBUILT_BUNDLE = '1';
  }

  if (await runSmokeModeIfConfigured()) {
    return;
  }

  registerHandlers();
  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({action: 'deny'}));
});
