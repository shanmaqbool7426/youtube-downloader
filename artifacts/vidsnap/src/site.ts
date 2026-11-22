/**
 * Per-page metadata. The prerender step (scripts/prerender.mjs) writes these
 * into each page's <head>, and the server uses the same paths to decide which
 * URLs are real pages (everything else gets a genuine 404).
 */
export interface PageMeta {
  path: string;
  /** Output file inside dist/public. */
  file: string;
  title: string;
  description: string;
  /** Keep the homepage-only JSON-LD (WebApplication / FAQ) on this page. */
  homeSchema?: boolean;
  noindex?: boolean;
}

export const PAGES: PageMeta[] = [
  {
    path: '/',
    file: 'index.html',
    title: 'YouTube Video Downloader 1080p – Free HD, 4K & MP3 | ClipZap',
    description:
      'Download YouTube videos in 1080p Full HD, 720p, 4K or MP3 for free. Paste a link, see real file sizes for every format and save with audio. No app, no sign-up.',
    homeSchema: true,
  },
  {
    path: '/privacy',
    file: 'privacy.html',
    title: 'Privacy Policy | ClipZap',
    description:
      'How ClipZap handles your data: no accounts, no tracking cookies, and video files that are streamed to you and never stored on our servers.',
  },
  {
    path: '/terms',
    file: 'terms.html',
    title: 'Terms of Use | ClipZap',
    description:
      'The terms for using ClipZap, the free online YouTube video downloader, including acceptable use and respecting creator copyright.',
  },
  {
    path: '/404',
    file: '404.html',
    title: 'Page Not Found | ClipZap',
    description: 'The page you were looking for does not exist.',
    noindex: true,
  },
];
