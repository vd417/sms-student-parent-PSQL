import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryRetryDelay, queryShouldRetry } from '@/api/retry';
import { queryPersister } from './queryPersister';

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: queryShouldRetry,
      retryDelay: queryRetryDelay,
      staleTime: 30_000,
      gcTime: CACHE_MAX_AGE_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: false,
      // 'always' runs the mutation immediately so apiFetch can block offline
      // writes. 'online' would pause and auto-replay on reconnect (a write queue).
      networkMode: 'always',
    },
  },
});

export async function clearPersistedQueryCache() {
  queryClient.clear();
  queryClient.getMutationCache().clear();
  await queryPersister.removeClient();
}

export function QueryProvider({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'test') {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: CACHE_MAX_AGE_MS,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === 'success',
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
