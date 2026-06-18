import { Download, Eye, Share2, Trash2 } from "lucide-react";
import Tooltip from "../../../shared/Tooltip";

const HistoryActions = ({ className = "" }: { className?: string }) => (
  <div
    className={`flex h-8 w-fit items-center gap-1 rounded-3xl bg-gray-10 px-3 py-1 ${className}`}
  >
    <Tooltip content="Delete" position="top">
      <button
        type="button"
        className="flex items-center justify-center"
        aria-label="Delete appreciation"
      >
        <Trash2 className="h-4 w-4 text-red-400" />
      </button>
    </Tooltip>
    <span className="h-4 w-px bg-gray-300" />
    <Tooltip content="Download" position="top">
      <button
        type="button"
        className="flex items-center justify-center"
        aria-label="Download appreciation"
      >
        <Download className="h-4 w-4 text-primary" />
      </button>
    </Tooltip>
    <span className="h-4 w-px bg-gray-300" />
    <Tooltip content="Share" position="top">
      <button
        type="button"
        className="flex items-center justify-center"
        aria-label="Share appreciation"
      >
        <Share2 className="h-4 w-4 text-info" />
      </button>
    </Tooltip>
    <span className="h-4 w-px bg-gray-300" />
    <Tooltip content="View" position="top">
      <button
        type="button"
        className="flex items-center justify-center"
        aria-label="View appreciation"
      >
        <Eye className="h-4 w-4 text-primary" />
      </button>
    </Tooltip>
  </div>
);

export default HistoryActions;
