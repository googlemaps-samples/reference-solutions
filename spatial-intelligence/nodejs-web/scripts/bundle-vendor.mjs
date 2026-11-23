import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const outDir = resolve(rootDir, 'dist', 'assets');

await mkdir(outDir, { recursive: true });

await build({
  entryPoints: [resolve(__dirname, 'vendor-entry.mjs')],
  outfile: resolve(outDir, 'vendor.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  minify: true,
  sourcemap: false,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

console.log('Built browser vendor bundle at dist/assets/vendor.mjs');
