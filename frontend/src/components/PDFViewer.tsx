import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url';

// Configure PDF.js worker
const configurePdfWorker = () => {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch (error) {
    console.warn('Failed to configure PDF.js worker locally:', error);
  }
};
configurePdfWorker();

interface PDFViewerProps {
  pdfUrl: string;
  className?: string;
  title?: string;
  mode?: 'iframe-blob' | 'react-pdf' | 'iframe-direct' | 'auto';
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
  const [scale, setScale] = useState<number>(1.2);
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

        let effectiveMode = mode;
        if (mode === 'auto') {
          effectiveMode = 'iframe-direct';
        }
        setActualMode(effectiveMode);

        const response = await fetch(pdfUrl, { credentials: "include" });
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);

        const blob = await response.blob();
        setPdfBlob(blob);

        if (effectiveMode === 'iframe-blob' || effectiveMode === 'iframe-direct') {
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setIsLoading(false);
      }
    };

    if (pdfUrl) loadPDF();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.6));
  const handleResetZoom = () => setScale(1.2);

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
      <div className="text-center p-4">
      <p className="text-red-500 mb-4">{error}</p>
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 transition-colors"
      >
        Download PDF
      </a>
    </div>
    );
  }

  if (actualMode === 'react-pdf') {
    return (
      <div className={`flex flex-col bg-gray-100 ${className}`}>
        {/* Top Toolbar (Zoom Controls) */}
        <div className="flex items-center justify-center p-2 py-4 bg-white border-b">
          <button
            onClick={handleZoomOut}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            -
          </button>
          <span className="mx-2 text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            +
          </button>
          <button
            onClick={handleResetZoom}
            className="ml-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            Reset
          </button>
        </div>

        {/* PDF Display */}
        <div className="flex-1 overflow-auto p-4 justify-center lg:flex">
          {pdfBlob && (
            <Document
              file={pdfBlob}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
            >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                scale={scale}
                className="shadow-lg"
              />
            </Document>
          )}
        </div>

        {/* Bottom Pagination */}
        <div className="flex items-center justify-center p-2 bg-white border-t">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded text-sm"
          >
            Previous
          </button>
          <span className="mx-3 text-sm text-gray-600">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded text-sm"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

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
