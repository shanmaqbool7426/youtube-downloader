/** Brand mark: the same bolt-on-tile shape as favicon.svg, so tab icon and header match. */
export function Logo() {
  return (
    <a href="/" className="logo" aria-label="HD Grab home">
      <svg className="logo-mark" viewBox="0 0 180 180" width="32" height="32" aria-hidden="true">
        <rect width="180" height="180" rx="40" fill="currentColor" />
        <path d="M92 28 L58 100 L82 100 L72 152 L110 76 L86 76 L100 28 Z" fill="#fff" />
      </svg>
      <span>
        HD<span className="logo-accent"> Grab</span>
      </span>
    </a>
  );
}
