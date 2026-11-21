import { Zap } from 'lucide-react';

const TOOL_LINKS = [
  { label: '1080p Downloader', href: '#downloader' },
  { label: 'Resolution Guide', href: '#resolution' },
  { label: 'Features', href: '#features' },
  { label: 'FAQ', href: '#faq' },
];

const COMPANY_LINKS = [
  { label: 'About', href: '#' },
  { label: 'Tools', href: '#downloader' },
  { label: 'Blog', href: '#' },
  { label: 'Contact', href: '#' },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms & Conditions', href: '#' },
  { label: 'Responsible Use', href: '#responsible' },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#downloader" className="logo">
              <span className="logo-icon">
                <Zap size={22} />
              </span>
              <span>HD Grab</span>
            </a>
            <p>
              HD Grab is a browser-based YouTube downloader focused on Full HD quality. Paste a URL
              and access the best available 1080p video options instantly.
            </p>
          </div>
          <div className="footer-col">
            <h4>Download Tools</h4>
            <ul>
              {TOOL_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h4>Privacy &amp; Legal</h4>
            <ul>
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 HD Grab. All rights reserved.</span>
          <span>For personal use only · Respect creator rights and platform guidelines</span>
        </div>
      </div>
    </footer>
  );
}