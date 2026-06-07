import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'node_modules', '@vladmandic', 'face-api', 'model');
const target = path.join(root, 'public', 'models', 'face-api');

if (!existsSync(source)) {
  console.warn('[copy-face-models] face-api models not found — run npm install first');
  process.exit(0);
}

mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true, force: true });
console.log('[copy-face-models] copied models to public/models/face-api');
