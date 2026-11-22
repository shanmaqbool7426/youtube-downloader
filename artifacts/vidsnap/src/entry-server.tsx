import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Root } from './Root';
import { ErrorBoundary } from './components/error-boundary';

export { PAGES } from './site';
export { FAQ_ITEMS } from './components/faq';

/** Build-time only: renders a page to static HTML so crawlers get full content without JS. */
export function render(path: string): string {
  return renderToString(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={new QueryClient()}>
          <Root path={path} />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
