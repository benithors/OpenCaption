import {build} from 'esbuild';
import path from 'node:path';

const shared = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  external: ['electron', 'openai', 'remotion', '@remotion/*', '@rspack/*'],
  tsconfig: path.resolve(process.cwd(), 'tsconfig.base.json'),
};

await Promise.all([
  build({
    ...shared,
    entryPoints: ['src/electron/main.ts'],
    outfile: 'dist-electron/main.js',
  }),
  build({
    ...shared,
    entryPoints: ['src/electron/preload.ts'],
    outfile: 'dist-electron/preload.js',
  }),
]);
