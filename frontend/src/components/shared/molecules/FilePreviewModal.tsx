import DOMPurify from "dompurify";
import { renderAsync } from "docx-preview";
import { Download, ExternalLink, File, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import PDFViewer from "../../PDFViewer";
import {
  FileTypeIcon,
  getFileTypeInfo,
} from "../../../utils/fileUtils";

interface FilePreviewModalProps {
  fileUrl: string;
  fileName?: string;
  onClose: () => void;
}


// ─── Shared Loading / Error UI ────────────────────────────────────────────────

function PreviewLoading({ message = "Loading preview…" }: { message?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-3 text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

function PreviewFallback({ fileUrl, fileName, message }: { fileUrl: string; fileName: string; message: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
        <File className="w-8 h-8 text-orange-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800 mb-1">Preview unavailable</p>
        <p className="text-xs text-gray-500 max-w-xs">{message}</p>
      </div>
      <a
        href={fileUrl}
        download={fileName}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Download className="h-4 w-4" />
        Download File
      </a>
    </div>
  );
}

// ─── Preview Renderers ────────────────────────────────────────────────────────

function ImagePreview({ fileUrl, fileName, zoom }: { fileUrl: string; fileName: string; zoom: number }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
      <div className="transition-transform duration-200 ease-out" style={{ transform: `scale(${zoom / 100})` }}>
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full object-contain rounded shadow-lg"
          style={{ maxHeight: "80vh" }}
        />
      </div>
    </div>
  );
}

function PdfPreview({ fileUrl }: { fileUrl: string }) {
  return (
    <PDFViewer
      pdfUrl={fileUrl}
      mode="react-pdf"
      className="w-full h-full"
      title="PDF Preview"
    />
  );
}

/**
 * Renders .docx using docx-preview — renders directly from OOXML with full
 * fidelity: page layout, colors, fonts, images, tables, exactly as in Word.
 *
 * Uses useEffect + AbortController to properly cancel in-flight fetches
 * when the component unmounts or fileUrl changes (fixes potential memory leaks
 * and race conditions from the previous useCallback-ref approach).
 */
function DocxPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Step 1: Fetch the file as ArrayBuffer with proper AbortController cleanup
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(false);
    setBuffer(null);

    fetch(fileUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.arrayBuffer();
      })
      .then((buf) => {
        setBuffer(buf);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(true);
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [fileUrl]);

  // Step 2: Once buffer is ready and container is mounted, render with docx-preview
  const containerCallback = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
    },
    [],
  );

  useEffect(() => {
    if (!buffer || !containerRef.current) return;
    const node = containerRef.current;

    renderAsync(buffer, node, undefined, {
      className: "docx-preview",
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
      experimental: false,
      trimXmlDeclaration: true,
      useBase64URL: true,
      renderChanges: false,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
    })
      .then(() => {
        const overlay = node.parentElement?.querySelector<HTMLDivElement>(".docx-loading");
        if (overlay) overlay.style.display = "none";
      })
      .catch(() => {
        const overlay = node.parentElement?.querySelector<HTMLDivElement>(".docx-loading");
        if (overlay) {
          overlay.innerHTML = `<div style="text-align:center;color:#ef4444;padding:16px">Failed to render document.</div>`;
        }
      });
  }, [buffer]);

  if (error)
    return <PreviewFallback fileUrl={fileUrl} fileName={fileName} message="Could not load this Word document for preview." />;

  return (
    <div className="w-full h-full overflow-auto bg-gray-200 relative" style={{ padding: "24px 0" }}>
      {/* Loading overlay — hidden once renderAsync completes */}
      {isLoading && (
        <div className="docx-loading" style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#e5e7eb", zIndex: 10,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 40, height: 40,
              border: "3px solid #3b82f6",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto",
            }} />
            <p style={{ marginTop: 12, fontSize: 14, color: "#6b7280" }}>Rendering document…</p>
          </div>
        </div>
      )}
      {/* docx-preview renders page divs into this container */}
      <div ref={containerCallback} className="docx-preview-container" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .docx-preview-container .docx-wrapper {
          background: #e5e7eb !important;
          padding: 24px 0 !important;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .docx-preview-container section.docx {
          box-shadow: 0 4px 24px rgba(0,0,0,0.18);
          margin-bottom: 24px;
          background: #fff;
        }
      `}</style>
    </div>
  );
}

/** Parses XLSX/XLS using SheetJS and renders as an HTML table */
function ExcelPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [tableHtml, setTableHtml] = useState<string | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(false);

    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (cancelled) return;
        const wb = XLSX.read(buffer, { type: "array" });
        const sheetNames = wb.SheetNames;
        setWorkbook(wb);
        setSheets(sheetNames);
        setActiveSheet(sheetNames[0]);
        const html = XLSX.utils.sheet_to_html(wb.Sheets[sheetNames[0]], { id: "xlsx-table" });
        setTableHtml(html);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [fileUrl]);

  const switchSheet = (name: string) => {
    if (!workbook) return;
    setActiveSheet(name);
    const html = XLSX.utils.sheet_to_html(workbook.Sheets[name], { id: "xlsx-table" });
    setTableHtml(html);
  };

  if (isLoading) return <PreviewLoading message="Parsing spreadsheet…" />;
  if (error || tableHtml === null)
    return <PreviewFallback fileUrl={fileUrl} fileName={fileName} message="Could not parse this spreadsheet for preview." />;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-1 px-3 pt-2 border-b border-gray-200 bg-gray-50 flex-shrink-0 overflow-x-auto">
          {sheets.map((name) => (
            <button
              key={name}
              onClick={() => switchSheet(name)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap ${
                name === activeSheet
                  ? "border-blue-500 text-blue-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {/* Table — sanitized with DOMPurify to prevent XSS from malicious xlsx files */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className="xlsx-table-wrapper"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tableHtml) }}
        />
      </div>
      <style>{`
        .xlsx-table-wrapper table {
          border-collapse: collapse;
          font-size: 12px;
          font-family: ui-monospace, monospace;
          width: 100%;
        }
        .xlsx-table-wrapper td,
        .xlsx-table-wrapper th {
          border: 1px solid #e5e7eb;
          padding: 4px 8px;
          white-space: nowrap;
          vertical-align: top;
        }
        .xlsx-table-wrapper tr:first-child td,
        .xlsx-table-wrapper th {
          background: #f9fafb;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .xlsx-table-wrapper tr:hover td {
          background: #f0f9ff;
        }
      `}</style>
    </div>
  );
}

/** Fetches CSV text, parses it, renders as a table */
function CsvPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(false);

    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (cancelled) return;
        // Use SheetJS to parse CSV — handles quoting, commas in fields, etc.
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
        setRows(data as string[][]);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [fileUrl]);

  if (isLoading) return <PreviewLoading message="Parsing CSV…" />;
  if (error || rows === null)
    return <PreviewFallback fileUrl={fileUrl} fileName={fileName} message="Could not parse this CSV file." />;

  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1);

  return (
    <div className="w-full h-full overflow-auto bg-white p-4">
      <table className="border-collapse text-xs font-mono w-full">
        <thead>
          <tr className="bg-gray-100 sticky top-0 z-10">
            {headers.map((h, i) => (
              <th
                key={i}
                className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap"
              >
                {String(h ?? "")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => (
            <tr key={ri} className="hover:bg-blue-50 transition-colors">
              {headers.map((_, ci) => (
                <td key={ci} className="border border-gray-200 px-3 py-1.5 text-gray-700 whitespace-nowrap">
                  {String(row[ci] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Fetches and renders plain text / markdown as-is */
function TextPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(false);

    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.text();
      })
      .then((text) => {
        if (!cancelled) { setContent(text); setIsLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setError(true); setIsLoading(false); }
      });

    return () => { cancelled = true; };
  }, [fileUrl]);

  if (isLoading) return <PreviewLoading />;
  if (error || content === null)
    return <PreviewFallback fileUrl={fileUrl} fileName={fileName} message="Could not load this text file." />;

  return (
    <div className="w-full h-full overflow-auto p-6 bg-white">
      <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words font-mono leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

function VideoPreview({ fileUrl }: { fileUrl: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black p-4">
      <video src={fileUrl} controls className="max-w-full max-h-full rounded shadow-lg">
        Your browser does not support video playback.
      </video>
    </div>
  );
}

function UnknownPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  return (
    <PreviewFallback
      fileUrl={fileUrl}
      fileName={fileName}
      message="This file type cannot be previewed in the browser. Download it to open it locally."
    />
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function FilePreviewModal({ fileUrl, fileName: customFileName, onClose }: FilePreviewModalProps) {
  const [imageZoom, setImageZoom] = useState(100);

  // Strip query params/fragments and guard against trailing slashes
  const fileName = customFileName || fileUrl.split(/[?#]/)[0].split("/").pop() || "File";
  const { category, label, iconColor, bgColor } = getFileTypeInfo(fileName);

  const handleZoomIn  = useCallback(() => setImageZoom((p) => Math.min(p + 25, 200)), []);
  const handleZoomOut = useCallback(() => setImageZoom((p) => Math.max(p - 25, 50)),  []);
  const handleResetZoom = useCallback(() => setImageZoom(100), []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const renderPreview = () => {
    switch (category) {
      case "image":        return <ImagePreview fileUrl={fileUrl} fileName={fileName} zoom={imageZoom} />;
      case "pdf":          return <PdfPreview fileUrl={fileUrl} />;
      case "office-word":  return <DocxPreview fileUrl={fileUrl} fileName={fileName} />;
      case "office-excel": return <ExcelPreview fileUrl={fileUrl} fileName={fileName} />;
      case "csv":          return <CsvPreview fileUrl={fileUrl} fileName={fileName} />;
      case "text":         return <TextPreview fileUrl={fileUrl} fileName={fileName} />;
      case "video":        return <VideoPreview fileUrl={fileUrl} />;
      default:             return <UnknownPreview fileUrl={fileUrl} fileName={fileName} />;
    }
  };

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
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1.5 py-0.5 mr-1">
                <button
                  onClick={handleZoomOut}
                  disabled={imageZoom <= 50}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5 text-gray-600" />
                </button>
                <span className="text-xs font-medium text-gray-600 min-w-[36px] text-center">{imageZoom}%</span>
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
              download={fileName}
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

        {/* ── Preview Area ── */}
        <div className="flex-1 overflow-hidden bg-gray-100 relative">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
