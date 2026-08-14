import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_APK_ARTIFACT_URL =
  'https://expo.dev/artifacts/eas/92pkNvRXYyej8_t7dPdSSSdEEpedf0cNnYkSCAE1bv0.apk';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(rootDir, 'public', 'Lavey.apk');
const sourceUrl = process.env.VITE_ANDROID_DOWNLOAD_URL?.trim() || DEFAULT_APK_ARTIFACT_URL;

if (!process.env.NETLIFY && !process.env.CI && existsSync(outputPath)) {
  console.info('[fetch-apk] public/Lavey.apk already exists — skipping download.');
  process.exit(0);
}

console.info(`[fetch-apk] Downloading ${sourceUrl}`);
const response = await fetch(sourceUrl, { redirect: 'follow' });
if (!response.ok) {
  throw new Error(`Could not download APK (${response.status} ${response.statusText})`);
}

const bytes = Buffer.from(await response.arrayBuffer());
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, bytes);
console.info(`[fetch-apk] Saved public/Lavey.apk (${bytes.length.toLocaleString()} bytes)`);
