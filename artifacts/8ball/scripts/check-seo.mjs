import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const publicDir = new URL('../dist/public/', import.meta.url);
const html = await readFile(new URL('index.html', publicDir), 'utf8');
const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
assert.ok(canonical && canonical.startsWith('https://') && !canonical.includes('.replit.dev'), 'Use a published HTTPS canonical URL.');
const title = html.match(/<title>(.*?)<\/title>/)?.[1];
assert.match(title ?? '', /Jev Online Playground/);
const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
assert.ok(description && description.length <= 160, 'Keep the search description concise.');
const headings = [...html.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/gs)];
assert.equal(headings.length, 1, 'Render exactly one main heading in the initial HTML.');
assert.match(headings[0][1], /Jev online playground/);
assert.ok(html.includes('independent project'), 'Keep the independence disclaimer in the rendered page.');
assert.ok(html.includes('faq-keys') && html.includes('faq-usage'), 'Include the real FAQ in the initial HTML.');
assert.ok(!html.includes('<div id="root"></div>'), 'The published HTML must be prerendered.');
const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? 'null');
assert.equal(data?.['@type'], 'WebApplication');
assert.equal(data.url, canonical);
const robots = await readFile(new URL('robots.txt', publicDir), 'utf8');
assert.ok(robots.includes(`Sitemap: ${canonical}sitemap.xml`));
const sitemap = await readFile(new URL('sitemap.xml', publicDir), 'utf8');
assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
for (const property of ['og:url', 'og:image']) {
  const value = html.match(new RegExp(`<meta property="${property}" content="([^"]+)"`))?.[1];
  assert.equal(value, property === 'og:url' ? canonical : `${canonical}social-preview.png`);
}
assert.equal(data.image, `${canonical}social-preview.png`);
const image = await readFile(new URL('social-preview.png', publicDir));
assert.equal(image.readUInt32BE(16), 1200);
assert.equal(image.readUInt32BE(20), 630);
await readFile(new URL('favicon.png', publicDir));
console.log('SEO checks passed: rendered content, metadata, structured data, sitemap, and social image.');
