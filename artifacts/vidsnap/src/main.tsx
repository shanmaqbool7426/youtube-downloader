import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Root } from './Root';
import { ErrorBoundary } from './components/error-boundary';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Sensible defaults for a public downloader: retry transient failures,
      // but give up quickly (yt-dlp calls are not cheap).
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // The info mutation surfaces its own error state in the UI; no auto-retry.
      retry: 0,
    },
  },
});

const tree = (
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Root path={window.location.pathname} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);

const container = document.getElementById('root')!;
// Production pages are prerendered (scripts/prerender.mjs); the dev server serves an empty root.
if (container.firstElementChild) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
