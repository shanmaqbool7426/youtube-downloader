import { Download } from 'lucide-react';
import { Logo } from './logo';

const NAV = [
  { label: 'How it works', href: '/#how-to-use' },
  { label: 'Quality guide', href: '/#resolution' },
  { label: 'Features', href: '/#features' },
  { label: 'FAQ', href: '/#faq' },
];

export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Logo />
        <nav aria-label="Primary">
          <ul className="nav-links">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <a className="nav-cta" href="/#downloader">
          <Download size={16} aria-hidden="true" />
          Download a video
        </a>
      </div>
    </header>
  );
}
