import {
  Download,
  ExternalLink,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface FilePreviewModalProps {
  fileUrl: string;
  onClose: () => void;
}

const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|bmp|webp)$/i;

export function FilePreviewModal({ fileUrl, onClose }: FilePreviewModalProps) {
  const [imageZoom, setImageZoom] = useState(100);
  const fileName = fileUrl.split("/").pop() || "File";
  const isImage = IMAGE_REGEX.test(fileUrl);
  const isPdf = fileUrl.toLowerCase().endsWith(".pdf");

  const handleZoomIn = useCallback(
    () => setImageZoom((prev) => Math.min(prev + 25, 200)),
    [],
  );
  const handleZoomOut = useCallback(
    () => setImageZoom((prev) => Math.max(prev - 25, 50)),
    [],
  );
  const handleResetZoom = useCallback(() => setImageZoom(100), []);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full h-full md:rounded-xl md:w-[90vw] md:h-[90vh] md:max-w-4xl flex flex-col overflow-hidden shadow-2xl md:animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          {/* File name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900 truncate">
              {fileName}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            {/* Zoom controls — images only */}
            {isImage && (
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1.5 py-0.5 mr-1">
                <button
                  onClick={handleZoomOut}
                  disabled={imageZoom <= 50}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5 text-gray-600" />
                </button>
                <span className="text-xs font-medium text-gray-600 min-w-[36px] text-center">
                  {imageZoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={imageZoom >= 200}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5 text-gray-600" />
                </button>
                <div className="w-px h-3.5 bg-gray-300 mx-0.5" />
                <button
                  onClick={handleResetZoom}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-gray-600" />
                </button>
              </div>
            )}

            <a
              href={fileUrl}
              download
              className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4 text-gray-600" />
            </a>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
              title="Open in New Tab"
            >
              <ExternalLink className="h-4 w-4 text-gray-600" />
            </a>
            <div className="w-px h-4 bg-gray-300 mx-0.5" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-red-100 transition-colors"
              title="Close"
            >
              <X className="h-4 w-4 text-gray-500 hover:text-red-600" />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-gray-100">
          {isPdf ? (
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title="Document Viewer"
            />
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
              <div
                className="transition-transform duration-200 ease-out"
                style={{ transform: `scale(${imageZoom / 100})` }}
              >
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="max-w-full object-contain rounded shadow-lg"
                  style={{ maxHeight: "80vh" }}
                />
              </div>
            </div>
          ) : (
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title="Document Viewer"
            />
          )}
        </div>
      </div>
    </div>
  );
}
