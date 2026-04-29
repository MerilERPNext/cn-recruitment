import DOMPurify from "dompurify";
import { renderAsync } from "docx-preview";
import { Download, File } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import PDFViewer from "../../PDFViewer";
import {
  getFileTypeInfo,
} from "../../../utils/fileUtils";

interface FilePreviewProps {
  fileUrl: string;
  fileName?: string;
  className?: string;
  zoom?: number;
}

// ─── Shared Components ────────────────────────────────────────────────────────

function ZoomToolbar({ scale, onZoomIn, onZoomOut }: { scale: number; onZoomIn: () => void; onZoomOut: () => void }) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
      <div className="text-xs text-gray-500 font-medium px-2">
        Document Preview
      </div>
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onZoomOut}
          disabled={scale <= 0.3}
          className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          title="Zoom out"
        >
          −
        </button>
        <span className="text-xs text-gray-600 px-1 min-w-[55px] text-center font-mono">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          disabled={scale >= 4.0}
          className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          title="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function PreviewLoading({ message = "Loading preview…" }: { message?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-3 text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

export function PreviewFallback({ fileUrl, fileName, message }: { fileUrl: string; fileName: string; message: string }) {
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

export function ImagePreview({ fileUrl, fileName, zoom = 100 }: { fileUrl: string; fileName: string; zoom?: number }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-6 overflow-auto bg-gray-50/50">
      <div className="transition-transform duration-200 ease-out" style={{ transform: `scale(${zoom / 100})` }}>
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full object-contain rounded shadow-xl"
          style={{ maxHeight: "80vh" }}
        />
      </div>
    </div>
  );
}

export function PdfPreview({ fileUrl }: { fileUrl: string }) {
  return (
    <PDFViewer
      pdfUrl={fileUrl}
      mode="react-pdf"
      className="w-full h-full"
      title="PDF Preview"
    />
  );
}

export function DocxPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1.0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(false);
    setBuffer(null);

    fetch(fileUrl, {
      signal: controller.signal,
      credentials: "include"
    })
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

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.1, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));

  if (error)
    return <PreviewFallback fileUrl={fileUrl} fileName={fileName} message="Could not load this Word document for preview." />;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <ZoomToolbar scale={scale} onZoomIn={zoomIn} onZoomOut={zoomOut} />
      <div className="flex-1 overflow-auto bg-gray-200 relative scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
        {isLoading && (
          <div className="docx-loading" style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#f3f4f6", zIndex: 10,
          }}>
            <div style={{ textAlign: "center" }}>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
              <p style={{ marginTop: 12, fontSize: 14, color: "#6b7280" }}>Rendering document…</p>
            </div>
          </div>
        )}
        <div
          ref={containerCallback}
          className="docx-preview-container origin-top transition-transform duration-200 ease-out"
          style={{ transform: `scale(${scale})`, padding: `${24 * scale}px 0` }}
        />
        <style>{`
          .docx-preview-container .docx-wrapper {
            background: transparent !important;
            padding: 0 !important;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .docx-preview-container section.docx {
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            margin-bottom: 24px;
            background: #fff;
            border-radius: 4px;
          }
        `}</style>
      </div>
    </div>
  );
}

export function ExcelPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [tableHtml, setTableHtml] = useState<string | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(false);

    fetch(fileUrl, { credentials: "include" })
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

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));

  if (isLoading) return <PreviewLoading message="Parsing spreadsheet…" />;
  if (error || tableHtml === null)
    return <PreviewFallback fileUrl={fileUrl} fileName={fileName} message="Could not parse this spreadsheet for preview." />;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">
      <ZoomToolbar scale={scale} onZoomIn={zoomIn} onZoomOut={zoomOut} />
      {sheets.length > 1 && (
        <div className="flex gap-1 px-3 pt-2 border-b border-gray-200 bg-gray-50 flex-shrink-0 overflow-x-auto scrollbar-hide">
          {sheets.map((name) => (
            <button
              key={name}
              onClick={() => switchSheet(name)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap ${name === activeSheet
                ? "border-blue-500 text-blue-600 bg-white shadow-sm"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto p-4 bg-gray-50/30">
        <div
          className="xlsx-table-wrapper origin-top-left transition-transform duration-200 ease-out shadow-sm bg-white border border-gray-200 rounded"
          style={{ transform: `scale(${scale})` }}
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
          padding: 6px 10px;
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

export function CsvPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(false);

    fetch(fileUrl, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (cancelled) return;
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

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));

  if (isLoading) return <PreviewLoading message="Parsing CSV…" />;
  if (error || rows === null)
    return <PreviewFallback fileUrl={fileUrl} fileName={fileName} message="Could not parse this CSV file." />;

  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">
      <ZoomToolbar scale={scale} onZoomIn={zoomIn} onZoomOut={zoomOut} />
      <div className="flex-1 overflow-auto p-4 bg-gray-50/30">
        <div
          className="origin-top-left transition-transform duration-200 ease-out shadow-sm bg-white border border-gray-200 rounded inline-block min-w-full"
          style={{ transform: `scale(${scale})` }}
        >
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
      </div>
    </div>
  );
}

export function TextPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(false);

    fetch(fileUrl, { credentials: "include" })
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

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.1, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));

  if (isLoading) return <PreviewLoading />;
  if (error || content === null)
    return <PreviewFallback fileUrl={fileUrl} fileName={fileName} message="Could not load this text file." />;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">
      <ZoomToolbar scale={scale} onZoomIn={zoomIn} onZoomOut={zoomOut} />
      <div className="flex-1 overflow-auto p-6 bg-white scrollbar-thin">
        <pre
          className="text-sm text-gray-800 whitespace-pre-wrap break-words font-mono leading-relaxed origin-top-left transition-transform duration-200 ease-out"
          style={{ transform: `scale(${scale})` }}
        >
          {content}
        </pre>
      </div>
    </div>
  );
}

export function VideoPreview({ fileUrl }: { fileUrl: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black p-4">
      <video src={fileUrl} controls className="max-w-full max-h-full rounded shadow-2xl">
        Your browser does not support video playback.
      </video>
    </div>
  );
}

export function UnknownPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  return (
    <PreviewFallback
      fileUrl={fileUrl}
      fileName={fileName}
      message="This file type cannot be previewed in the browser. Download it to open it locally."
    />
  );
}

export function FilePreview({ fileUrl, fileName: customFileName, className = "", zoom }: FilePreviewProps) {
  const urlFileName = fileUrl.split(/[?#]/)[0].split("/").pop() || "";
  const fileName = customFileName || urlFileName || "File";
  const { category: detectedCategory } = getFileTypeInfo(fileName);

  // If customFileName didn't have an extension, fallback to detecting from the URL
  const category = (detectedCategory === "unknown" && urlFileName)
    ? getFileTypeInfo(urlFileName).category
    : detectedCategory;

  return (
    <div className={`w-full h-full flex flex-col bg-white overflow-hidden ${className}`}>
      {(() => {
        switch (category) {
          case "image": return <ImagePreview fileUrl={fileUrl} fileName={fileName} zoom={zoom} />;
          case "pdf": return <PdfPreview fileUrl={fileUrl} />;
          case "office-word": return <DocxPreview fileUrl={fileUrl} fileName={fileName} />;
          case "office-excel": return <ExcelPreview fileUrl={fileUrl} fileName={fileName} />;
          case "csv": return <CsvPreview fileUrl={fileUrl} fileName={fileName} />;
          case "text": return <TextPreview fileUrl={fileUrl} fileName={fileName} />;
          case "video": return <VideoPreview fileUrl={fileUrl} />;
          default: return <UnknownPreview fileUrl={fileUrl} fileName={fileName} />;
        }
      })()}
    </div>
  );
}
