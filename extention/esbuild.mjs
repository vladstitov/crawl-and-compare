import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const staticDir = path.join(__dirname, 'static');

const isWatch = process.argv.includes('--watch');

function copyStaticFiles() {
  if (!existsSync(staticDir)) return;

  mkdirSync(distDir, { recursive: true });
  cpSync(staticDir, distDir, { recursive: true });
}

const commonOptions = {
  bundle: true,
  sourcemap: true,
  minify: !isWatch,
  target: 'chrome120',
  outdir: distDir,
  entryNames: '[name]',
  logLevel: 'info'
};

const contexts = [
  {
    entryPoints: ['src/background.ts'],
    format: 'esm'
  },
  {
    entryPoints: ['src/content.ts'],
    format: 'iife'
  },
  {
    entryPoints: ['src/popup.ts'],
    format: 'iife'
  }
];

try {
  copyStaticFiles();

  if (isWatch) {
    for (const ctx of contexts) {
      const watcher = await build({
        ...commonOptions,
        ...ctx,
        watch: {
          onRebuild(error) {
            if (error) {
              console.error('Rebuild failed:', error.message);
              return;
            }
            copyStaticFiles();
            console.log('Rebuild succeeded');
          }
        }
      });

      if (!watcher) {
        throw new Error('Failed to start watch mode.');
      }
    }

    console.log('Watching for changes...');
  } else {
    for (const ctx of contexts) {
      await build({
        ...commonOptions,
        ...ctx
      });
    }

    copyStaticFiles();
    console.log('Build completed.');
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
