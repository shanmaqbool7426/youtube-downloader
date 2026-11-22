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
  /**
   * Date of the last meaningful content change (YYYY-MM-DD), used for the
   * sitemap <lastmod>. Bump it by hand when you edit the page — deriving it
   * from the build time makes every deploy claim "changed today", which teaches
   * crawlers to ignore the field entirely.
   */
  lastmod: string;
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
    lastmod: '2026-11-22',
    homeSchema: true,
  },
  {
    path: '/privacy',
    file: 'privacy.html',
    title: 'Privacy Policy | ClipZap',
    description:
      'How ClipZap handles your data: no accounts, no tracking cookies, and video files that are streamed to you and never stored on our servers.',
    lastmod: '2026-11-22',
  },
  {
    path: '/help/missing-audio',
    file: 'help/missing-audio.html',
    title: 'Why a Downloaded Video Has No Sound | ClipZap',
    description:
      'A downloaded YouTube video with no sound is almost always a video-only format. Here is how to pick a row that includes audio, and what to do when a merge fails.',
    lastmod: '2026-11-22',
  },
  {
    path: '/help/missing-1080p',
    file: 'help/missing-1080p.html',
    title: 'Why 1080p Is Not Always Available | ClipZap',
    description:
      'Missing 1080p usually means the upload is not Full HD, the video is still processing, or the rendition is restricted. How to check at the source and what to pick instead.',
    lastmod: '2026-11-22',
  },
  {
    path: '/help/find-downloads',
    file: 'help/find-downloads.html',
    title: 'Where Downloads Go on iPhone and Android | ClipZap',
    description:
      'Exactly where a saved YouTube video lands on iPhone, iPad, Android and desktop — and what to check when no file appears at all.',
    lastmod: '2026-11-22',
  },
  {
    path: '/terms',
    file: 'terms.html',
    title: 'Terms of Use | ClipZap',
    description:
      'The terms for using ClipZap, the free online YouTube video downloader, including acceptable use and respecting creator copyright.',
    lastmod: '2026-11-22',
  },
  {
    path: '/404',
    file: '404.html',
    title: 'Page Not Found | ClipZap',
    description: 'The page you were looking for does not exist.',
    lastmod: '2026-11-22',
    noindex: true,
  },
];
