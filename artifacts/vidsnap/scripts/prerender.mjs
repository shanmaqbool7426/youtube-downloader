// Runs after `vite build` and the SSR build. Renders every page in src/site.ts to
// static HTML, so search engines and link previews get full content and correct
// per-page meta without executing JavaScript. Also writes robots.txt and sitemap.xml.
import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { fillHead, homeJsonLd, siteUrl } from './seo-head.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'dist', 'public');
const serverDir = path.join(root, 'dist', 'server');

const { render, PAGES, FAQ_ITEMS } = await import(
  pathToFileURL(path.join(serverDir, 'entry-server.js')).href
);

const origin = siteUrl();
const template = await readFile(path.join(outDir, 'index.html'), 'utf8');

for (const page of PAGES) {
  const html = fillHead(template, page, origin)
    .replace('<!--app-head-->', page.homeSchema ? homeJsonLd(origin, FAQ_ITEMS) : '')
    .replace('<!--app-html-->', render(page.path));
  await writeFile(path.join(outDir, page.file), html);
  console.log(`prerendered ${page.path} -> ${page.file}`);
}

const today = new Date().toISOString().slice(0, 10);
const indexable = PAGES.filter((page) => !page.noindex);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable
  .map(
    (page) => `  <url>
    <loc>${origin}${page.path}</loc>
    <lastmod>${today}</lastmod>
  </url>`,
  )
  .join('\n')}
</urlset>
`;
await writeFile(path.join(outDir, 'sitemap.xml'), sitemap);

await writeFile(
  path.join(outDir, 'robots.txt'),
  `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`,
);
console.log(`robots.txt + sitemap.xml written for ${origin}`);

// The SSR bundle is a build tool only; don't ship it.
await rm(serverDir, { recursive: true, force: true });
