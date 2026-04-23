/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const REPEATED_INVALIDATION_COUNT = 2; // Reduced to 1 follow-up attempt to prevent amplification
const REPEATED_INVALIDATION_INTERVAL_MS = 5000; // Increased delay for better stability

// Track active background loops by individual Query Hash
const queryLoops = new Map<string, number[]>();

const repeatAction = (args: any[]) => {
  let filters: any = {};
  if (Array.isArray(args[0]) || typeof args[0] === 'string') {
    filters = { queryKey: [args[0]].flat() };
  } else {
    filters = args[0] || {};
  }

  const matchingQueries = queryClient.getQueryCache().findAll(filters);

  matchingQueries.forEach((query) => {
    const hash = query.queryHash;

    // Clear existing loop
    if (queryLoops.has(hash)) {
      queryLoops.get(hash)?.forEach(window.clearTimeout);
      queryLoops.delete(hash);
    }

    const timeouts: number[] = [];

    // Only 1 additional refetch after a delay to ensure data stability 
    // without "amplifying" every event into a burst.
    for (let attempt = 1; attempt < REPEATED_INVALIDATION_COUNT; attempt++) {
      const timeout = window.setTimeout(() => {
        // Skip if query is inactive or already fetching to avoid redundant load
        if (query.isActive() && query.state.fetchStatus !== 'fetching') {
          console.log(`[QueryRetry] Performing stable refetch for: ${hash}`);

          queryClient.refetchQueries(
            { queryKey: query.queryKey, exact: true },
            { cancelRefetch: false } // Don't cancel in-flight, just ensure we have latest
          ).catch(() => {});
        }

        if (attempt === REPEATED_INVALIDATION_COUNT - 1) {
          queryLoops.delete(hash);
        }
      }, REPEATED_INVALIDATION_INTERVAL_MS * attempt);

      timeouts.push(timeout);
    }

    queryLoops.set(hash, timeouts);
  });
};

// --- Global Interceptors ---
// We monkey-patch to ensure mutations that handle complex state propagation 
// (like payroll/attendance) are eventually consistent without requiring 
// every call-site to implement its own retry logic.

const originalInvalidateQueries = queryClient.invalidateQueries.bind(queryClient);
const originalRefetchQueries = queryClient.refetchQueries.bind(queryClient);
const originalResetQueries = queryClient.resetQueries.bind(queryClient);

queryClient.invalidateQueries = (...args: any[]) => {
  const result = originalInvalidateQueries(...args);
  repeatAction(args);
  return result;
};

queryClient.refetchQueries = (...args: any[]) => {
  const result = originalRefetchQueries(...args);
  repeatAction(args);
  return result;
};

queryClient.resetQueries = (...args: any[]) => {
  const result = originalResetQueries(...args);
  repeatAction(args);
  return result;
};




interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default QueryProvider;