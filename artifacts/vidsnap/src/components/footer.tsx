import { Logo } from './logo';

const TOOL_LINKS = [
  { label: 'YouTube 1080p downloader', href: '/#downloader' },
  { label: 'How it works', href: '/#how-to-use' },
  { label: 'Quality guide', href: '/#resolution' },
];

const HELP_LINKS = [
  { label: 'A video has no sound', href: '/help/missing-audio' },
  { label: '1080p is not listed', href: '/help/missing-1080p' },
  { label: 'Find the file on a phone', href: '/help/find-downloads' },
  { label: 'FAQ', href: '/#faq' },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Responsible Use', href: '/#responsible' },
];

const COLUMNS = [
  { title: 'Downloader', links: TOOL_LINKS },
  { title: 'Help', links: HELP_LINKS },
  { title: 'Legal', links: LEGAL_LINKS },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>
              ClipZap is a free, browser-based YouTube downloader. Paste a link to save videos in
              1080p Full HD, 720p, 4K or as MP3 audio, with real file sizes shown up front.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav className="footer-col" key={col.title} aria-label={col.title}>
              <p className="footer-col-title">{col.title}</p>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} ClipZap. All rights reserved.</span>
          <span>
            ClipZap is not affiliated with YouTube or Google LLC. Download only content you have the
            right to save.
          </span>
        </div>
      </div>
    </footer>
  );
}
