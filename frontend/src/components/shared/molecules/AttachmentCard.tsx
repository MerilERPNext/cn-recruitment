import {
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Image as ImageIcon,
} from "lucide-react";
import { useState } from "react";
import Button from "../atoms/Button";
import Tooltip from "../Tooltip";
import { FilePreviewModal } from "./FilePreviewModal";

// ─── Shared file type helper (mirrors FilePreviewModal logic) ─────────────────

type FileCategory =
  | "image"
  | "pdf"
  | "office-word"
  | "office-excel"
  | "text"
  | "video"
  | "unknown";

interface FileTypeInfo {
  category: FileCategory;
  label: string;
  iconColor: string;
  bgColor: string;
}

function getFileTypeInfo(url: string): FileTypeInfo {
  // Strip query parameters and fragments before extracting the extension
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
    case "csv":
      return {
        category: "office-excel",
        label: ext === "csv" ? "CSV Spreadsheet" : "Excel Spreadsheet",
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

function FileCategoryIcon({
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
      return <FileSpreadsheet className={className} />;
    case "video":
      return <FileVideo className={className} />;
    default:
      return <File className={className} />;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AttachmentCard({
  fileUrl,
  compact = false,
}: {
  fileUrl: string;
  compact?: boolean;
}) {
  // Strip query params/fragments and guard against trailing slashes
  const fileName = fileUrl.split(/[?#]/)[0].split("/").pop() || "File";
  const [showPreview, setShowPreview] = useState(false);
  const { category, label, iconColor, bgColor } = getFileTypeInfo(fileUrl);

  const ActionButtons = (
    <div className="flex gap-2 items-center">
      <Tooltip content={"View"}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(true)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </Tooltip>

      <Tooltip content={"Download"}>
        <a href={fileUrl} download={fileName}>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </a>
      </Tooltip>
    </div>
  );

  return (
    <>
      {compact ? (
        ActionButtons
      ) : (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
          {/* Thumbnail — image preview for images, icon for everything else */}
          <div
            className={`w-12 h-12 rounded-md overflow-hidden border flex items-center justify-center flex-shrink-0 ${
              category === "image" ? "bg-white" : bgColor
            }`}
          >
            {category === "image" ? (
              <img
                src={fileUrl}
                alt={fileName}
                className="w-full h-full object-cover"
              />
            ) : (
              <FileCategoryIcon
                category={category}
                className={`w-6 h-6 ${iconColor}`}
              />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {fileName}
            </p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>

          {/* Actions */}
          {ActionButtons}
        </div>
      )}

      {showPreview && (
        <FilePreviewModal
          fileUrl={fileUrl}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
