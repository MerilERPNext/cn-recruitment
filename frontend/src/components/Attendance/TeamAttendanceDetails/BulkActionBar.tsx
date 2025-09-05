import { BulkActionProps } from "../../../types/attendance";

export function BulkActionBar({
  selectedIds,
  pendingRequests,
  onSelectAll,
  onBulkAction,
}: BulkActionProps) {
  if (pendingRequests.length === 0) return null;

  const allSelected = selectedIds.length === pendingRequests.length;

  return (
    <div className="p-2 px-6 bg-blue-50 rounded-xl lg:rounded-none">

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
            className="w-1/2 px-3 py-1.5 rounded-md bg-red-100 shadow-sm text-red-600 text-sm hover:bg-red-100 transition-colors border border-transparent hover:border-red-200"
            onClick={() => onBulkAction("Reject")}
          >
            Bulk Reject ({selectedIds.length})
          </button>
          <button
            className="w-1/2 px-3 py-1.5 rounded-md bg-green-100 shadow-sm text-green-600 text-sm hover:bg-green-100 transition-colors border border-transparent hover:border-green-200"
            onClick={() => onBulkAction("Approve")}
          >
            Bulk Approve ({selectedIds.length})
          </button>
        </div>
      )}
    </div>
  );
}
