// @vitest-environment node
import {beforeAll, describe, expect, it} from 'vitest';
import path from 'node:path';
import {existsSync} from 'node:fs';
import {mkdir, stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {probeVideo} from '../electron/ffmpeg';
import {exportSubtitledVideo} from '../electron/export-video';
import {defaultSubtitleStyle, normalizeSegmentsToCues} from '@shared/subtitles';

const fixturePaths = [
  path.resolve(process.cwd(), 'fixtures/generated/fixture-short.mp4'),
  path.resolve(process.cwd(), 'fixtures/generated/fixture-short.mov'),
];
const outputDir = path.resolve(process.cwd(), 'test-results');

describe('export orchestration', () => {
  beforeAll(async () => {
    await mkdir(outputDir, {recursive: true});
    if (!fixturePaths.every((fixturePath) => existsSync(fixturePath))) {
      spawnSync('node', ['scripts/generate-fixtures.mjs'], {stdio: 'inherit'});
    }
  }, 120000);

  it.each(fixturePaths)('renders a burned-in MP4 using the Remotion composition for %s', async (fixturePath) => {
    const video = await probeVideo(fixturePath);
    const cues = normalizeSegmentsToCues([
      {start: 0.1, end: 2.2, text: 'Hello from the subtitle app.'},
      {start: 2.4, end: 4.2, text: 'This is a caption test.'},
    ]);
    const fixtureLabel = path.basename(fixturePath).replace(/\./g, '-');
    const outputPath = path.join(outputDir, `${fixtureLabel}-export.mp4`);

    await exportSubtitledVideo({
      video,
      cues,
      style: defaultSubtitleStyle(),
      outputPath,
    });

    const exportStats = await stat(outputPath);
    expect(exportStats.size).toBeGreaterThan(0);
  }, 180000);
});
