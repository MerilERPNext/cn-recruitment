import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import {
  FileTypeIcon,
  getFileTypeInfo,
} from "../../../utils/fileUtils";
import { FilePreview } from "./FilePreview";

interface FilePreviewModalProps {
  fileUrl: string;
  fileName?: string;
  onClose: () => void;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function FilePreviewModal({ fileUrl, fileName: customFileName, onClose }: FilePreviewModalProps) {
  const [imageZoom, setImageZoom] = useState(100);

  // Strip query params/fragments and guard against trailing slashes
  const fileName = customFileName || fileUrl.split(/[?#]/)[0].split("/").pop() || "File";
  const { category, label, iconColor, bgColor } = getFileTypeInfo(fileName);

  const handleZoomIn = useCallback(() => setImageZoom((p) => Math.min(p + 25, 200)), []);
  const handleZoomOut = useCallback(() => setImageZoom((p) => Math.max(p - 25, 50)), []);
  const handleResetZoom = useCallback(() => setImageZoom(100), []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
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
        {/* ── Header Toolbar ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          {/* File name + type icon */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-md ${bgColor} flex items-center justify-center flex-shrink-0`}>
              <FileTypeIcon category={category} className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-900 block truncate">{fileName}</span>
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Zoom — images only */}
            {category === "image" && (
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-1.5 py-0.5 mr-1">
                <button
                  onClick={handleZoomOut}
                  disabled={imageZoom <= 50}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 min-w-[36px] text-center">{imageZoom}%</span>
                <button
                  onClick={handleZoomIn}
                  disabled={imageZoom >= 200}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                </button>
                <div className="w-px h-3.5 bg-gray-300 dark:bg-gray-600 mx-0.5" />
                <button
                  onClick={handleResetZoom}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            )}

            {!(window.isApp && fileUrl.startsWith("blob:")) && (
              <a
                href={fileUrl}
                download={fileName}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                title="Download"
              >
                <Download className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </a>
            )}

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
              title="Open in New Tab"
            >
              <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </a>

            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />

            <button
              onClick={onClose}
              className="p-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 transition-colors flex items-center justify-center"
              title="Close"
            >
              <X className="h-4 w-4 text-current" />
            </button>
          </div>
        </div>

        {/* ── Preview Area ── */}
        <div className="flex-1 overflow-hidden bg-gray-100 relative">
          <FilePreview
            fileUrl={fileUrl}
            fileName={fileName}
            zoom={imageZoom}
          />
        </div>
      </div>
    </div>
  );
}
