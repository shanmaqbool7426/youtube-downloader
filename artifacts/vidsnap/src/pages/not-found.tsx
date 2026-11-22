export default function NotFound() {
  return (
    <main id="main" className="legal container not-found">
      <p className="eyebrow">Error 404</p>
      <h1>Page not found</h1>
      <p className="legal-intro">
        The page you were looking for doesn't exist or has moved. The downloader is just one click
        away.
      </p>
      <a className="btn-primary" href="/">
        Go to the downloader
      </a>
    </main>
  );
}
