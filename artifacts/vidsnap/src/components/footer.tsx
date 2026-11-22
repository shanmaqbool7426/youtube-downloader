import { Logo } from './logo';

const TOOL_LINKS = [
  { label: 'YouTube 1080p Downloader', href: '/#downloader' },
  { label: 'How to Download', href: '/#how-to-use' },
  { label: 'Video Quality Guide', href: '/#resolution' },
  { label: 'Features', href: '/#features' },
];

const HELP_LINKS = [
  { label: 'FAQ', href: '/#faq' },
  { label: 'Why Full HD', href: '/#why-hd' },
  { label: 'Use Cases', href: '/#use-cases' },
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
              HD Grab is a free, browser-based YouTube video downloader. Paste a link to save videos
              in 1080p Full HD, 720p, 4K or as MP3 audio, with real file sizes shown up front.
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
          <span>© {new Date().getFullYear()} HD Grab. All rights reserved.</span>
          <span>
            HD Grab is not affiliated with YouTube or Google LLC. Download only content you have the
            right to save.
          </span>
        </div>
      </div>
    </footer>
  );
}
