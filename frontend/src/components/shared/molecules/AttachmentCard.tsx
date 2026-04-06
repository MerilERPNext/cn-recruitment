import { Download, Eye } from "lucide-react";
import { useState } from "react";
import { FileTypeIcon, getFileTypeInfo, getFileName } from "../../../utils/fileUtils";
import Button from "../atoms/Button";
import Tooltip from "../Tooltip";
import { FilePreviewModal } from "./FilePreviewModal";

export function AttachmentCard({
  fileUrl,
  compact = false,
}: {
  fileUrl: string;
  compact?: boolean;
}) {
  const fileName = getFileName(fileUrl);
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
              <FileTypeIcon
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
