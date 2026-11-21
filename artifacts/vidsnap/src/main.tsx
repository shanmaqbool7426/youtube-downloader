import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App';
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

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ErrorBoundary>,
);
