import App from './App';
import { Header } from './components/header';
import { Footer } from './components/footer';
import { PrivacyPage, TermsPage } from './pages/legal';
import NotFound from './pages/not-found';

function Page({ path }: { path: string }) {
  switch (path.replace(/\/+$/, '') || '/') {
    case '/':
    case '/index.html':
      return <App />;
    case '/privacy':
      return <PrivacyPage />;
    case '/terms':
      return <TermsPage />;
    default:
      return <NotFound />;
  }
}

/** Shared shell. `path` comes from the prerenderer on the server and from location in the browser. */
export function Root({ path }: { path: string }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <Page path={path} />
      <Footer />
    </>
  );
}
