import path from 'node:path';
import {rm} from 'node:fs/promises';
import {bundle} from '@remotion/bundler';

const outDir = path.resolve(process.cwd(), 'dist-remotion');
await rm(outDir, {recursive: true, force: true});

await bundle({
  entryPoint: path.resolve(process.cwd(), 'src/remotion/index.ts'),
  outDir,
  enableCaching: true,
  publicPath: './',
});

console.log(JSON.stringify({outDir}, null, 2));
