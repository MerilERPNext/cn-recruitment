/**
 * Shared file type utilities used by AttachmentCard and FilePreviewModal.
 * Single source of truth — no duplication between components.
 */
import {
  File,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Image as ImageIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FileCategory =
  | "image"
  | "pdf"
  | "office-word"
  | "office-excel"
  | "csv"        // separate from office-excel so the modal can render it differently
  | "text"
  | "video"
  | "unknown";

export interface FileTypeInfo {
  category: FileCategory;
  label: string;
  iconColor: string;
  bgColor: string;
}

// ─── File Type Detector ───────────────────────────────────────────────────────

/**
 * Returns display metadata for a file URL based on its extension.
 * Strips query parameters and URL fragments before extracting the extension
 * so that URLs like `/file.pdf?token=123` are correctly identified.
 */
export function getFileTypeInfo(url: string): FileTypeInfo {
  const path = url.split(/[?#]/)[0];
  const ext = path.split(".").pop()?.toLowerCase() ?? "";

  switch (ext) {
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "bmp":
    case "svg":
      return {
        category: "image",
        label: "Image",
        iconColor: "text-emerald-600",
        bgColor: "bg-emerald-100",
      };

    case "pdf":
      return {
        category: "pdf",
        label: "PDF Document",
        iconColor: "text-red-600",
        bgColor: "bg-red-100",
      };

    case "doc":
    case "docx":
      return {
        category: "office-word",
        label: "Word Document",
        iconColor: "text-blue-600",
        bgColor: "bg-blue-100",
      };

    case "xls":
    case "xlsx":
      return {
        category: "office-excel",
        label: "Excel Spreadsheet",
        iconColor: "text-green-700",
        bgColor: "bg-green-100",
      };

    case "csv":
      return {
        category: "csv",
        label: "CSV Spreadsheet",
        iconColor: "text-green-700",
        bgColor: "bg-green-100",
      };

    case "txt":
    case "md":
    case "log":
    case "json":
    case "xml":
    case "yaml":
    case "yml":
      return {
        category: "text",
        label: ext === "md" ? "Markdown File" : "Text File",
        iconColor: "text-gray-600",
        bgColor: "bg-gray-200",
      };

    case "mp4":
    case "webm":
    case "ogg":
    case "mov":
      return {
        category: "video",
        label: "Video",
        iconColor: "text-purple-600",
        bgColor: "bg-purple-100",
      };

    default:
      return {
        category: "unknown",
        label: ext ? `${ext.toUpperCase()} File` : "File",
        iconColor: "text-orange-600",
        bgColor: "bg-orange-100",
      };
  }
}

// ─── File Icon Component ──────────────────────────────────────────────────────

/**
 * Renders the appropriate Lucide icon for a given file category.
 */
export function FileTypeIcon({
  category,
  className,
}: {
  category: FileCategory;
  className?: string;
}) {
  switch (category) {
    case "image":
      return <ImageIcon className={className} />;
    case "pdf":
    case "office-word":
    case "text":
      return <FileText className={className} />;
    case "office-excel":
    case "csv":
      return <FileSpreadsheet className={className} />;
    case "video":
      return <FileVideo className={className} />;
    default:
      return <File className={className} />;
  }
}

// ─── Filename Utility ─────────────────────────────────────────────────────────

/**
 * Extracts a clean filename from a URL, stripping query params, fragments,
 * and guarding against trailing slashes / empty results.
 */
export function getFileName(url: string): string {
  return url.split(/[?#]/)[0].split("/").pop() || "File";
}
