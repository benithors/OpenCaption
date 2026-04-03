import {mkdirSync, existsSync, rmSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = process.cwd();
const generatedDir = path.join(root, 'fixtures', 'generated');
mkdirSync(generatedDir, {recursive: true});

const shortAiff = path.join(generatedDir, 'fixture-short.aiff');
const shortMp4 = path.join(generatedDir, 'fixture-short.mp4');
const shortMov = path.join(generatedDir, 'fixture-short.mov');
const longAiff = path.join(generatedDir, 'fixture-long.aiff');
const longMp4 = path.join(generatedDir, 'fixture-long-or-large.mp4');

const run = (command, args) => {
  const result = spawnSync(command, args, {stdio: 'inherit'});
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with ${result.status}`);
  }
};

if (!existsSync(shortMp4)) {
  rmSync(shortAiff, {force: true});
  run('say', ['-o', shortAiff, 'Hello from the subtitle app. This is a caption test. Edit the line and export the result.']);
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=0x111827:s=1080x1920:d=8.8',
    '-i', shortAiff,
    '-shortest',
    shortMp4,
  ]);
}

if (!existsSync(shortMov)) {
  run('ffmpeg', ['-y', '-i', shortMp4, '-c', 'copy', shortMov]);
}

if (!existsSync(longMp4)) {
  rmSync(longAiff, {force: true});
  run('say', ['-o', longAiff, 'This synthetic oversized fixture exists to exercise chunking logic in tests. '.repeat(60)]);
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=0x0f172a:s=1080x1920:d=60',
    '-i', longAiff,
    '-shortest',
    longMp4,
  ]);
}

console.log(JSON.stringify({shortMp4, shortMov, longMp4}, null, 2));
