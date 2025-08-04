import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker with fallback options
const configurePdfWorker = () => {
  try {
    // Primary: Use unpkg CDN (more reliable)
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  } catch (error) {
    console.warn('Failed to configure PDF.js worker:', error);
    // Fallback: Use jsdelivr CDN
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  }
};

configurePdfWorker();

/**
 * PDFViewer Component - Handles PDF display with multiple viewing modes
 * 
 * CORS Issue Fix:
 * - The original issue was that Mozilla's hosted PDF.js viewer couldn't access blob URLs 
 *   from different origins due to CORS restrictions
 * - We now convert blobs to data URLs for iframe-blob mode to avoid this issue
 * - The 'auto' mode defaults to 'iframe-direct' which uses browser's built-in PDF viewer
 * 
 * Modes:
 * - 'auto': Automatically selects the best mode (defaults to iframe-direct)
 * - 'iframe-direct': Uses browser's built-in PDF viewer with blob URL (most reliable)
 * - 'iframe-blob': Uses Mozilla's PDF.js viewer with data URL (full PDF.js features)
 * - 'react-pdf': Uses react-pdf library with custom controls (most customizable)
 */

interface PDFViewerProps {
  pdfUrl: string;
  className?: string;
  title?: string;
  mode?: 'iframe-blob' | 'react-pdf' | 'iframe-direct' | 'auto'; // Different viewing modes
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  pdfUrl, 
  className = "", 
  title = "PDF Document",
  mode = 'auto' 
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actualMode, setActualMode] = useState<string>(mode);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let objectUrl: string;

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Determine the actual mode to use
        let effectiveMode = mode;
        if (mode === 'auto') {
          // Auto mode: prefer iframe-direct for reliability, fallback to react-pdf
          effectiveMode = 'iframe-direct';
        }
        setActualMode(effectiveMode);

        // Fetch the PDF as a blob
        const response = await fetch(pdfUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }

        const blob = await response.blob();
        
        // Verify it's a PDF
        if (!blob.type.includes('pdf') && !blob.type.includes('application/octet-stream')) {
          console.warn('File might not be a PDF, type:', blob.type);
        }

        // Store blob for react-pdf mode
        setPdfBlob(blob);

        // Create blob URL for iframe modes
        if (effectiveMode === 'iframe-blob' || effectiveMode === 'iframe-direct') {
          objectUrl = URL.createObjectURL(blob);
          
          if (effectiveMode === 'iframe-blob') {
            // Convert blob to data URL to avoid CORS issues with Mozilla's hosted PDF.js
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              const pdfJsViewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(dataUrl)}`;
              setBlobUrl(pdfJsViewerUrl);
              setIsLoading(false);
            };
            reader.onerror = () => {
              console.warn('Failed to convert blob to data URL, falling back to direct blob URL');
              setBlobUrl(objectUrl);
              setIsLoading(false);
            };
            reader.readAsDataURL(blob);
          } else {
            // Direct blob URL (browser's built-in PDF viewer)
            setBlobUrl(objectUrl);
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }

      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setIsLoading(false);
      }
    };

    if (pdfUrl) {
      loadPDF();
    }

    // Cleanup function to revoke blob URL
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [pdfUrl, mode]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF document:', error);
    setError('Failed to load PDF document');
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-4">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading PDF</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </a>
        </div>
      </div>
    );
  }

  // React-PDF mode with custom controls
  if (actualMode === 'react-pdf') {
    return (
      <div className={`flex flex-col bg-gray-100 ${className}`}>
        {/* Controls */}
        <div className="flex items-center justify-between p-2 bg-white border-b">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
              disabled={pageNumber >= numPages}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
            >
              Next
            </button>
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-primary hover:text-primary-700 text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download
          </a>
        </div>
        
        {/* PDF Document */}
        <div className="flex-1 overflow-auto p-4 flex justify-center">
          {pdfBlob && (
            <Document
              file={pdfBlob}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                renderTextLayer={false}
                renderAnnotationLayer={false}
                scale={1.2}
                className="shadow-lg"
              />
            </Document>
          )}
        </div>
      </div>
    );
  }

  // Iframe modes (blob or direct)
  return (
    <iframe
      ref={iframeRef}
      src={blobUrl}
      className={className}
      title={title}
      allow="fullscreen"
    />
  );
};

export default PDFViewer;