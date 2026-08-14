import { copyFileSync, existsSync } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_APK_ARTIFACT_URL =
  'https://expo.dev/artifacts/eas/92pkNvRXYyej8_t7dPdSSSdEEpedf0cNnYkSCAE1bv0.apk';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(rootDir, 'public', 'Lavey.apk');
const mobileApkPath = path.join(rootDir, '..', 'lavey_mobile', 'Lavey.apk');
const sourceUrl = process.env.VITE_ANDROID_DOWNLOAD_URL?.trim() || DEFAULT_APK_ARTIFACT_URL;

/** Prefer the locally built mobile APK whenever it exists (keeps website in sync with Gradle builds). */
if (existsSync(mobileApkPath)) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  copyFileSync(mobileApkPath, outputPath);
  const { size } = await stat(outputPath);
  console.info(
    `[fetch-apk] Synced lavey_mobile/Lavey.apk → public/Lavey.apk (${size.toLocaleString()} bytes)`,
  );
  process.exit(0);
}

if (existsSync(outputPath)) {
  const { size } = await stat(outputPath);
  console.info(`[fetch-apk] public/Lavey.apk already present (${size.toLocaleString()} bytes) — skipping download.`);
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
