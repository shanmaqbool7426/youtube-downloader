// Runs after `vite build` and the SSR build. Renders every page in src/site.ts to
// static HTML, so search engines and link previews get full content and correct
// per-page meta without executing JavaScript. Also writes robots.txt and sitemap.xml.
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { breadcrumbJsonLd, fillHead, homeJsonLd, siteUrl } from './seo-head.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'dist', 'public');
const serverDir = path.join(root, 'dist', 'server');

const { render, PAGES, FAQ_ITEMS } = await import(
  pathToFileURL(path.join(serverDir, 'entry-server.js')).href
);

const origin = siteUrl();
const template = await readFile(path.join(outDir, 'index.html'), 'utf8');

for (const page of PAGES) {
  // The homepage carries the site-wide graph; subpages get a breadcrumb trail
  // that mirrors what is already visible on the page. noindex pages get neither.
  const head = page.homeSchema
    ? homeJsonLd(origin, FAQ_ITEMS)
    : page.noindex
      ? ''
      : breadcrumbJsonLd(origin, page);
  const html = fillHead(template, page, origin)
    .replace('<!--app-head-->', head)
    .replace('<!--app-html-->', render(page.path));
  // Page files may live in a subdirectory (help/missing-audio.html), which vite
  // does not create for us — writeFile would fail with ENOENT.
  const target = path.join(outDir, page.file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
  console.log(`prerendered ${page.path} -> ${page.file}`);
}

const indexable = PAGES.filter((page) => !page.noindex);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable
  .map(
    (page) => `  <url>
    <loc>${origin}${page.path}</loc>
    <lastmod>${page.lastmod}</lastmod>
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
