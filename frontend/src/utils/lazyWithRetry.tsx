import React, { lazy, ComponentType } from "react";

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // 1 second

interface LazyComponentModule {
  default: ComponentType<any>;
}

/**
 * Enhanced lazy loading with retry mechanism for chunk load failures
 * This solves race conditions and network issues when loading dynamic imports
 */
export function lazyWithRetry(
  componentImport: () => Promise<LazyComponentModule>,
  componentName?: string
): React.LazyExoticComponent<ComponentType<any>> {
  return lazy(async () => {
    let retryCount = 0;

    const loadComponent = async (): Promise<LazyComponentModule> => {
      try {
        return await componentImport();
      } catch (error: any) {
        retryCount++;

        // Check if it's a chunk load error
        const isChunkLoadError =
          error?.message?.includes('Loading chunk') ||
          error?.message?.includes('Failed to fetch dynamically imported module') ||
          error?.name === 'ChunkLoadError';

        if (isChunkLoadError && retryCount <= MAX_RETRY_COUNT) {
          console.warn(
            `Failed to load ${componentName || 'component'} chunk. Retry ${retryCount}/${MAX_RETRY_COUNT}...`
          );

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount));

          // If it's the last retry, try refreshing the page modules
          if (retryCount === MAX_RETRY_COUNT) {
            // Clear any module cache if available
            if ('caches' in window) {
              try {
                const cacheNames = await caches.keys();
                await Promise.all(
                  cacheNames
                    .filter(name => name.includes('vite'))
                    .map(name => caches.delete(name))
                );
              } catch (e) {
                console.warn('Failed to clear cache:', e);
              }
            }
          }

          return loadComponent();
        }

        // If not a chunk load error or max retries exceeded, throw the error
        throw error;
      }
    };

    return loadComponent();
  });
}

/**
 * Preload a lazy component to avoid race conditions
 * Call this for critical routes that users are likely to navigate to
 */
export function preloadComponent(
  componentImport: () => Promise<LazyComponentModule>
): void {
  componentImport().catch(error => {
    console.warn('Failed to preload component:', error);
  });
}

/**
 * HOC to wrap lazy components with additional error boundary and loading states
 */
export function withLazyRetry(
  componentImport: () => Promise<LazyComponentModule>,
  componentName?: string,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazyWithRetry(componentImport, componentName);

  return (props: any) => (
    <React.Suspense fallback={fallback || <DefaultLoadingSpinner />}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
}

const DefaultLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);