/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const REPEATED_INVALIDATION_COUNT = 5;
const REPEATED_INVALIDATION_INTERVAL_MS = 3000;

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

const originalInvalidateQueries = queryClient.invalidateQueries.bind(queryClient);
const originalRefetchQueries = queryClient.refetchQueries.bind(queryClient);
const originalResetQueries = queryClient.resetQueries.bind(queryClient);

// Map to track active background loops specifically by individual Query Hash
const queryLoops = new Map<string, any[]>();

/**
 * Surgical deduplication: identifies exactly which queries match the filter 
 * and ensures each has exactly one active background loop.
 */
const repeatAction = (args: any[]) => {
  let filters: any = {};
  if (Array.isArray(args[0]) || typeof args[0] === 'string') {
    filters = { queryKey: [args[0]].flat() };
  } else {
    filters = args[0] || {};
  }

  // Find all queries currently in the cache that match these filters
  const matchingQueries = queryClient.getQueryCache().findAll(filters);

  matchingQueries.forEach((query) => {
    const hash = query.queryHash;

    // Clear any existing background loop for this specific individual query
    if (queryLoops.has(hash)) {
      queryLoops.get(hash)?.forEach(clearTimeout);
      queryLoops.delete(hash);
    }

    const timeouts: any[] = [];

    for (let attempt = 1; attempt < REPEATED_INVALIDATION_COUNT; attempt++) {
      const timeout = setTimeout(() => {
        // Optimization: Only perform the background network call if the query is still "active"
        // (i.e., someone is still looking at this page/data).
        if (query.isActive()) {
          console.log(`Repeated background refetch for ACTIVE query: ${hash} (attempt ${attempt})`);
          originalRefetchQueries(
            { queryKey: query.queryKey, exact: true, type: 'all' },
            { cancelRefetch: true }
          ).catch((err) => console.error(`Background refetch failed for ${hash}:`, err));
        } else {
          console.log(`Skipping background refetch for INACTIVE query: ${hash}`);
        }

        // Cleanup map once the final attempt fires
        if (attempt === REPEATED_INVALIDATION_COUNT - 1) {
          queryLoops.delete(hash);
        }
      }, REPEATED_INVALIDATION_INTERVAL_MS * attempt);

      timeouts.push(timeout);
    }

    queryLoops.set(hash, timeouts);
  });
};

queryClient.invalidateQueries = (...args: any[]) => {
  console.log("interceptor: invalidateQueries called", args[0]);
  const initialInvalidation = originalInvalidateQueries(...args);
  repeatAction(args);
  return initialInvalidation;
};

queryClient.refetchQueries = (...args: any[]) => {
  console.log("interceptor: refetchQueries called", args[0]);
  const initialRefetch = originalRefetchQueries(...args);
  repeatAction(args);
  return initialRefetch;
};

queryClient.resetQueries = (...args: any[]) => {
  console.log("interceptor: resetQueries called", args[0]);
  const initialReset = originalResetQueries(...args);
  repeatAction(args);
  return initialReset;
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