/**
 * Global error handler for chunk loading failures
 * This intercepts and handles chunk loading errors at the window level
 */

// Track failed chunks to avoid infinite retry loops
const failedChunks = new Set<string>();

/**
 * Install global error handler for chunk loading failures
 */
export function installChunkErrorHandler(): void {
  // Handle unhandled promise rejections (common for dynamic imports)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;

    if (isChunkLoadError(error)) {
      event.preventDefault(); // Prevent console error
      handleChunkLoadError(error);
    }
  });

  // Handle regular errors
  window.addEventListener('error', (event) => {
    if (isChunkLoadError(event.error)) {
      event.preventDefault(); // Prevent console error
      handleChunkLoadError(event.error);
    }
  });
}

/**
 * Check if an error is a chunk loading error
 */
function isChunkLoadError(error: any): boolean {
  return (
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('Failed to fetch dynamically imported module') ||
    error?.message?.includes('Unable to preload CSS') ||
    error?.name === 'ChunkLoadError' ||
    // Check for network errors on module scripts
    (error?.target?.tagName === 'SCRIPT' && error?.type === 'error')
  );
}

/**
 * Handle chunk loading errors
 */
function handleChunkLoadError(error: any) {
  console.warn("Chunk load error detected:", error);

  // Reload once to fetch the latest build
  if (!window.__chunkReloaded) {
    window.__chunkReloaded = true;
    window.location.reload();
    return;
  }

  // If reload already happened and still failing => show prompt
  showRefreshPrompt();
}



/**
 * Attempt to recover from chunk loading error
 */
// async function recoverFromChunkError(): Promise<void> {
//   try {
//     // Clear module cache if using Vite HMR
//     if (import.meta.hot) {
//       import.meta.hot.invalidate();
//     }

//     // Clear service worker cache if available
//     if ('caches' in window) {
//       const cacheNames = await caches.keys();
//       const viteCaches = cacheNames.filter(name =>
//         name.includes('vite') || name.includes('chunk')
//       );

//       for (const cacheName of viteCaches) {
//         await caches.delete(cacheName);
//       }
//     }

//     // Clear failed chunks after recovery attempt
//     setTimeout(() => {
//       failedChunks.clear();
//     }, 5000);
//   } catch (error) {
//     console.error('Failed to recover from chunk error:', error);
//     showRefreshPrompt();
//   }
// }

/**
 * Show a user-friendly prompt to refresh the page
 */
function showRefreshPrompt(): void {
  // Check if we've already shown the prompt
  if (document.getElementById('chunk-error-prompt')) {
    return;
  }

  // Create a simple prompt
  const prompt = document.createElement('div');
  prompt.id = 'chunk-error-prompt';
  prompt.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    border: 1px solid #e5e7eb;
  `;

  prompt.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9V6h2v3H9zm0 4v-2h2v2H9z" fill="#f59e0b"/>
    </svg>
    <span style="color: #374151;">New version available</span>
    <button onclick="window.location.reload()" style="
      background: #3b82f6;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    ">Refresh</button>
    <button onclick="this.parentElement.remove()" style="
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px;
      margin-left: -8px;
    ">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="#9ca3af">
        <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/>
      </svg>
    </button>
  `;

  document.body.appendChild(prompt);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    prompt.remove();
  }, 10000);
}

/**
 * Clear all failed chunks (useful for manual recovery)
 */
export function clearFailedChunks(): void {
  failedChunks.clear();
}