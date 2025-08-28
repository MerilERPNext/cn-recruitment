
import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { useNavigate } from 'react-router';

// Configure PDF.js worker with multiple fallback options
const configurePdfWorker = () => {
  const workerSources = [
    `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`,
    `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`,
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.mjs`
  ];
  
  // Try the first worker source
  pdfjs.GlobalWorkerOptions.workerSrc = workerSources[0];
  
  // Store fallback sources for potential retry
  (window as any).__pdfWorkerFallbacks = workerSources.slice(1);
};

configurePdfWorker();

interface SecurePdfViewerProps {
  fetchUrl: string;
  className?: string;
}

const SecurePdfViewer: React.FC<SecurePdfViewerProps> = ({ fetchUrl, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);
  const [renderedPages, setRenderedPages] = useState<HTMLCanvasElement[]>([]);
  const navigate = useNavigate();


  const handleBackFromPDF = () => {
    navigate(-1)
  }

  useEffect(() => {
    const fetchPdf = async (currentRetryCount = 0) => {
      try {
        setIsLoading(true);
        setError('');
        
        const res = await fetch(fetchUrl, {
          method: 'GET',
          credentials: 'include', // Use cookies for auth
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch PDF: ${res.statusText}`);
        }

        const blob = await res.blob();
        
        // Verify it's a PDF
        if (!blob.type.includes('pdf') && !blob.type.includes('application/octet-stream')) {
          console.warn('File might not be a PDF, type:', blob.type);
        }
        
        const arrayBuffer = await blob.arrayBuffer();

        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF';
        
        // Check if it's a worker-related error and we can retry
        if ((errorMessage.includes('worker') || errorMessage.includes('Worker') || errorMessage.includes('dynamically imported module')) && currentRetryCount < 2) {
          console.log(`Worker failed, trying fallback ${currentRetryCount + 1}`);
          setRetryCount(currentRetryCount + 1);
          
          // Try fallback worker sources
          const fallbacks = (window as any).__pdfWorkerFallbacks;
          if (fallbacks && fallbacks[currentRetryCount]) {
            pdfjs.GlobalWorkerOptions.workerSrc = fallbacks[currentRetryCount];
            
            // Retry after a short delay
            setTimeout(() => {
              fetchPdf(currentRetryCount + 1);
            }, 1000);
            return;
          }
        }
        
        // Final error handling
        if (errorMessage.includes('worker') || errorMessage.includes('Worker') || errorMessage.includes('dynamically imported module')) {
          setError('PDF worker failed to load from all CDN sources. Please check your internet connection and try refreshing the page.');
        } else if (errorMessage.includes('fetch')) {
          setError('Failed to download PDF. Please check your internet connection.');
        } else {
          setError(errorMessage);
        }
        setIsLoading(false);
      }
    };

    if (fetchUrl) {
      fetchPdf();
    }
  }, [fetchUrl]);

  const handleRetry = () => {
    setRetryCount(0);
    setError('');
    // Reset to first worker source
    const workerSources = [
      `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`,
      `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`,
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.mjs`
    ];
    pdfjs.GlobalWorkerOptions.workerSrc = workerSources[0];
    (window as any).__pdfWorkerFallbacks = workerSources.slice(1);
    
    // Trigger re-fetch
    const retryFetchPdf = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        const res = await fetch(fetchUrl, {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch PDF: ${res.statusText}`);
        }

        const blob = await res.blob();
        
        if (!blob.type.includes('pdf') && !blob.type.includes('application/octet-stream')) {
          console.warn('File might not be a PDF, type:', blob.type);
        }
        
        const arrayBuffer = await blob.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF';
        setError(errorMessage);
        setIsLoading(false);
      }
    };
    
    retryFetchPdf();
  };

  useEffect(() => {
    const renderAllPages = async () => {
      if (!pdfDoc || numPages === 0) return;

      try {
        const canvases: HTMLCanvasElement[] = [];
        
        // Get container width for initial scale calculation
        const container = containerRef.current;
        const containerWidth = container ? container.clientWidth - 32 : 800; // Account for padding
        
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          
          // Calculate fit-to-width scale for reference
          const baseViewport = page.getViewport({ scale: 1 });
          const fitToWidthScale = (containerWidth * 0.95) / baseViewport.width;
          
          // Use user's zoom scale, but ensure minimum readability
          let actualScale = scale;
          
          // If user hasn't zoomed (scale is default 1.2), use responsive fit-to-width
          if (scale === 1.2) {
            actualScale = Math.max(fitToWidthScale, 0.8); // Minimum 80% scale for readability
          }
          
          const viewport = page.getViewport({ scale: actualScale });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.className = 'shadow-lg bg-white mb-4 mx-auto block rounded';

          await page.render({ canvasContext: context, viewport }).promise;
          canvases.push(canvas);
        }
        
        setRenderedPages(canvases);
      } catch (err) {
        console.error('Error rendering pages:', err);
        setError('Failed to render PDF pages');
      }
    };

    renderAllPages();
  }, [pdfDoc, numPages, scale]);

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 4.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.3));

  // Update container with rendered pages
  useEffect(() => {
    const container = containerRef.current;
    if (!container || renderedPages.length === 0) return;

    // Clear existing content
    container.innerHTML = '';
    
    // Add all rendered pages with proper responsive layout
    renderedPages.forEach((canvas, index) => {
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'flex justify-center mb-6 last:mb-2';
      
      const canvasWrapper = document.createElement('div');
      canvasWrapper.className = 'relative max-w-full';
      
      const pageLabel = document.createElement('div');
      pageLabel.className = 'absolute -top-6 left-0 bg-gray-600 text-white text-xs px-2 py-1 rounded-t text-center min-w-[60px]';
      pageLabel.textContent = `Page ${index + 1}`;
      
      // Canvas styling for zoom support
      canvas.style.height = 'auto';
      canvas.style.display = 'block';
      
      canvasWrapper.appendChild(pageLabel);
      canvasWrapper.appendChild(canvas);
      pageWrapper.appendChild(canvasWrapper);
      container.appendChild(pageWrapper);
    });
  }, [renderedPages]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">
            Loading PDF...
            {retryCount > 0 && (
              <span className="block text-xs text-gray-500 mt-1">
                Trying alternative source ({retryCount}/2)
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading PDF</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Loading
            </button>
            <a
              href={fetchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Compact Controls */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        {/* Document Info */}
        <div className="text-sm text-gray-600 font-medium flex items-center gap-2">
  <button
    onClick={handleBackFromPDF}
    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
  >
    ← 
  </button>
  {numPages > 0 && (
    <span className="text-gray-500">
      {numPages} page{numPages !== 1 ? "s" : ""}
    </span>
  )}
</div>


        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.3}
            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom out"
          >
            −
          </button>
          <span className="text-xs text-gray-600 px-2 min-w-[65px] text-center font-mono">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 4.0}
            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom in"
          >
            +
          </button>
        </div>

      </div>

      {/* Scrollable PDF Container - Supports zooming */}
      <div className="flex-1 overflow-auto bg-gray-50 min-h-0">
        <div className="p-4">
          <div
            ref={containerRef}
            className="w-full max-w-none mx-auto"
            style={{ minWidth: 'fit-content' }}
          />
        </div>
      </div>
    </div>
  );
};

export default SecurePdfViewer;
