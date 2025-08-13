import React from "react";

export interface LeaveBulkActionBarProps {
  pendingRequests: { name: string }[];
  selectedIds: string[];
  onSelectAll: () => void;
  onBulkAction: (action: "approved" | "rejected") => void;
}
export const LeaveBulkActionBar: React.FC<LeaveBulkActionBarProps> = ({
  pendingRequests,
  selectedIds,
  onSelectAll,
  onBulkAction,
}) => {
  if (!pendingRequests.length) return null;

  const allSelected = selectedIds.length === pendingRequests.length;

  return (
    <div className="p-2 px-4 bg-blue-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <input type="checkbox" checked={allSelected} onChange={onSelectAll} />
          <span className="text-sm font-medium text-blue-600">
            Select all pending requests
          </span>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex space-x-2 mt-2">
          <button
            className="bg-red-100 p-2 w-1/2 text-red-700 rounded-lg font-semibold"
            onClick={() => onBulkAction("rejected")}
          >
            Bulk Reject ({selectedIds.length})
          </button>
          <button
            className="bg-green-100 p-2 w-1/2 text-green-700 rounded-lg font-semibold"
            onClick={() => onBulkAction("approved")}
          >
            Bulk Approve ({selectedIds.length})
          </button>
        </div>
      )}
    </div>
  );
};
