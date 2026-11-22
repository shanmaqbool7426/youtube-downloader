// Shared by vite.config.ts (dev server) and prerender.mjs (production build).

// The edge (Cloudflare/Render) treats www as the primary host and 301s the
// apex to it, so www is the canonical host. Every canonical/OG/sitemap/JSON-LD
// URL derives from this constant — pointing it at the apex would make all of
// them point at a redirect.
export const DEFAULT_SITE_URL = 'https://www.clipzap.net';

/** Public origin of the site, without a trailing slash. Override with SITE_URL at build time (e.g. for staging). */
export function siteUrl() {
  return (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** "Privacy Policy | ClipZap" → "Privacy Policy", for breadcrumb labels. */
function crumbLabel(title) {
  return title.replace(/\s*\|\s*ClipZap$/, '');
}

/** Breadcrumb structured data: Home > this page. Mirrors the visible breadcrumb. */
export function breadcrumbJsonLd(origin, page) {
  const items = [
    { name: 'ClipZap', url: `${origin}/` },
    { name: crumbLabel(page.title), url: origin + page.path },
  ];
  const json = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

/** Fill the __PLACEHOLDERS__ in index.html for one page. */
export function fillHead(html, page, origin) {
  const canonical = origin + (page.path === '/' ? '/' : page.path);
  if (page.noindex) {
    // A noindex page must not declare itself canonical.
    html = html.replace(/\s*<link rel="canonical"[^>]*>/, '');
  }
  return html
    .replaceAll('__TITLE__', escapeHtml(page.title))
    .replaceAll('__DESCRIPTION__', escapeHtml(page.description))
    .replaceAll(
      '__ROBOTS__',
      page.noindex
        ? 'noindex, follow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    )
    .replaceAll('__CANONICAL__', canonical)
    .replaceAll('__SITE_URL__', origin);
}

/** Homepage structured data. FAQ entries come from the visible FAQ so the two never drift apart. */
export function homeJsonLd(origin, faqItems) {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: 'ClipZap',
      url: `${origin}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/icon-512.png`,
        width: 512,
        height: 512,
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      url: `${origin}/`,
      name: 'ClipZap',
      alternateName: ['clipzap.net', 'Clip Zap'],
      description:
        'Free online YouTube video downloader for 1080p Full HD, 720p, 4K and MP3 with real file sizes.',
      publisher: { '@id': `${origin}/#organization` },
      inLanguage: 'en-US',
    },
    {
      '@type': 'WebApplication',
      '@id': `${origin}/#webapp`,
      name: 'ClipZap YouTube Video Downloader',
      url: `${origin}/`,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Windows, macOS, Linux, Android, iOS',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      image: `${origin}/og-image.jpg`,
      description:
        'Paste a YouTube video URL, preview every available format with exact file sizes, and download 1080p Full HD, 720p, 4K or MP3 audio.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        '1080p Full HD downloads with audio merged in',
        '720p, 480p, 360p and 4K quality options',
        'MP3 audio extraction at 320 and 128 kbps',
        'Real file sizes shown before download',
        'No registration or software installation',
      ],
      publisher: { '@id': `${origin}/#organization` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${origin}/#faq`,
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(
    /</g,
    '\\u003c',
  );
  return `<script type="application/ld+json">${json}</script>`;
}
