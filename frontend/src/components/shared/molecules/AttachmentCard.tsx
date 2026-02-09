import { Download, Eye } from "lucide-react";
import Button from "../atoms/Button";

export function AttachmentCard({ fileUrl }: { fileUrl: string }) {
  const fileName = fileUrl.split("/").pop();

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-md overflow-hidden border bg-white flex items-center justify-center">
        <img
          src={fileUrl}
          alt={fileName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-medium text-gray-900 truncate">
          {fileName}
        </p>
        <p className="text-xs text-gray-500">Image</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="subtle" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </a>

        <a href={fileUrl} download>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </div>
  );
}
