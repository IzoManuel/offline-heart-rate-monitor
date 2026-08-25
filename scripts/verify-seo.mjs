import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const productionUrl = 'https://izomanuel.github.io/offline-heart-rate-monitor/';
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const robots = await readFile(new URL('../dist/robots.txt', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');

assert.match(html, /<title>Offline Bluetooth Heart Rate Monitor With DDFA And HRV<\/title>/);
assert.match(html, new RegExp(`<link rel="canonical" href="${productionUrl.replaceAll('/', '\\/')}"`));
assert.match(html, /name="description" content="[^"]{80,}/);
const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
assert.ok(jsonLd, 'JSON-LD is missing');
const structuredData = JSON.parse(jsonLd);
assert.equal(structuredData['@graph'][0]['@type'], 'WebSite');
assert.equal(structuredData['@graph'][1]['@type'], 'WebApplication');
assert.equal(structuredData['@graph'][1].offers.price, '0');
assert.match(robots, /User-agent: \*\s+Allow: \//);
assert.match(robots, new RegExp(`Sitemap: ${productionUrl.replaceAll('/', '\\/')}sitemap\\.xml`));
assert.match(sitemap, new RegExp(`<loc>${productionUrl.replaceAll('/', '\\/')}<\\/loc>`));

console.log('SEO verification passed: metadata, canonical, JSON-LD, robots, and sitemap are coherent.');
