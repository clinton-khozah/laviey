import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, '.env.android.dev');
const target = resolve(root, '.env.production');

if (!existsSync(source)) {
  console.error('Missing .env.android.dev — create it from .env.mobile.example');
  process.exit(1);
}

copyFileSync(source, target);
console.log('Using .env.android.dev → .env.production (emulator → host backend at 10.0.2.2:5000)');
