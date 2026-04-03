import path from 'node:path';
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';

const args = process.argv.slice(2);
const modeIndex = args.indexOf('--mode');
const mode = modeIndex >= 0 ? args[modeIndex + 1] : 'source';

const root = process.cwd();
const videoPath = path.resolve(root, process.env.SMOKE_VIDEO_PATH || 'testvideo/MCP_SHORT.mp4');
const outputDir = path.resolve(root, 'test-results');
const outputPath = path.join(outputDir, `real-video-${mode}-export.mp4`);
const reportPath = path.join(outputDir, `real-video-${mode}-report.json`);

const findPackagedBinary = () => {
  const releaseDir = path.resolve(root, 'release');
  const matches = readdirSync(releaseDir, {withFileTypes: true})
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('mac'))
    .map((entry) =>
      path.join(
        releaseDir,
        entry.name,
        'Social Subtitle Mac App.app',
        'Contents',
        'MacOS',
        'Social Subtitle Mac App',
      ),
    )
    .filter((candidate) => existsSync(candidate));

  return matches[0];
};

const appBinary = findPackagedBinary();

mkdirSync(outputDir, {recursive: true});

if (!existsSync(videoPath)) {
  throw new Error(`Smoke video not found: ${videoPath}`);
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY must be set in the environment for the real-video smoke test.');
}

const command = mode === 'packaged' ? appBinary : 'npm';
const commandArgs = mode === 'packaged' ? [] : ['start'];

if (mode === 'packaged' && !appBinary) {
  throw new Error('Packaged app binary not found under release/mac*/Social Subtitle Mac App.app.');
}

await new Promise((resolve, reject) => {
  const child = spawn(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      SOCIAL_SUBTITLE_SMOKE_INPUT: videoPath,
      SOCIAL_SUBTITLE_SMOKE_OUTPUT: outputPath,
      SOCIAL_SUBTITLE_SMOKE_REPORT: reportPath,
    },
  });

  child.on('exit', (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`Smoke run failed with exit code ${code}`));
  });
  child.on('error', reject);
});

const report = JSON.parse(await readFile(reportPath, 'utf8'));
await writeFile(reportPath, JSON.stringify({...report, verifiedOutputExists: existsSync(outputPath)}, null, 2), 'utf8');
console.log(JSON.stringify({mode, videoPath, outputPath, reportPath}, null, 2));
