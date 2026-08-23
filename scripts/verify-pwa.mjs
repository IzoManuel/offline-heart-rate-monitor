import { access, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve('dist');
const requiredFiles = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

for (const file of requiredFiles) {
  await access(resolve(dist, file));
}

const manifest = JSON.parse(await readFile(resolve(dist, 'manifest.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone' || manifest.start_url !== './') {
  throw new Error('Manifest is not configured for standalone, relative-scope installation.');
}

if (!manifest.icons?.some((icon) => icon.sizes === '512x512' && icon.purpose.includes('maskable'))) {
  throw new Error('Manifest is missing a 512px maskable icon.');
}

const serviceWorker = await readFile(resolve(dist, 'sw.js'), 'utf8');
if (!serviceWorker.includes('index.html') || !serviceWorker.includes('manifest.webmanifest')) {
  throw new Error('Service worker does not precache the application shell.');
}

const index = await readFile(resolve(dist, 'index.html'), 'utf8');
if (!index.includes('manifest.webmanifest')) {
  throw new Error('Built page does not link to the web app manifest.');
}

const assetName = index.match(/src="\.\/assets\/(index-[^"]+\.js)"/)?.[1];
if (!assetName) {
  throw new Error('Could not locate the built application script.');
}
const applicationScript = await readFile(resolve(dist, 'assets', assetName), 'utf8');
if (!applicationScript.includes('serviceWorker') || !applicationScript.includes('sw.js')) {
  throw new Error('Built application does not register its service worker.');
}

for (const icon of ['icons/icon-192.png', 'icons/icon-512.png']) {
  if ((await stat(resolve(dist, icon))).size < 1000) {
    throw new Error(`${icon} is unexpectedly small.`);
  }
}

console.log('PWA verification passed: manifest, icons, registration, and offline cache are present.');
