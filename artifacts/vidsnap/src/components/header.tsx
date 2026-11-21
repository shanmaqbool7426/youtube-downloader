import { Zap, Github } from 'lucide-react';

export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <a href="#downloader" className="logo">
          <span className="logo-icon">
            <Zap size={24} />
          </span>
          <span>HD Grab</span>
        </a>
        <nav aria-label="Primary">
          <ul className="nav-links">
            <li>
              <a href="#downloader">Downloader</a>
            </li>
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#faq">FAQ</a>
            </li>
          </ul>
        </nav>
        <a
          className="nav-cta"
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
        >
          <Github size={20} />
        </a>
      </div>
    </header>
  );
}