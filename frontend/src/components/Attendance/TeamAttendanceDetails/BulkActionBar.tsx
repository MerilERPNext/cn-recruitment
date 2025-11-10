import { BulkActionProps } from "../../../types/attendance";

export function BulkActionBar({
  selectedIds,
  pendingRequests,
  onSelectAll,
  onBulkAction,
  loadingAction,
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
      <span className="text-xs font-medium text-gray-400">
        Note - Requests which require other actions are not selectable for bulk
        approval
      </span>

      {selectedIds.length > 0 && (
        <div className="flex space-x-2 mt-2">
          <button
            className="w-1/2 px-3 py-1.5 rounded-md bg-red-100 shadow-sm text-red-600 text-sm hover:bg-red-100 transition-colors border border-transparent hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onBulkAction("Reject")}
            disabled={
              loadingAction?.isLoading && loadingAction?.action === "Reject"
            }
          >
            {loadingAction?.isLoading && loadingAction?.action === "Reject" ? (
              <span className="animate-spin border-2 border-red-600 border-t-transparent rounded-full w-4 h-4 inline-block"></span>
            ) : (
              <>Bulk Reject ({selectedIds?.filter((i) => i)?.length})</>
            )}
          </button>

          <button
            className="w-1/2 px-3 py-1.5 rounded-md bg-green-100 shadow-sm text-green-600 text-sm hover:bg-green-100 transition-colors border border-transparent hover:border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onBulkAction("Approve")}
            disabled={
              loadingAction?.isLoading && loadingAction?.action === "Approve"
            }
          >
            {loadingAction?.isLoading && loadingAction?.action === "Approve" ? (
              <span className="animate-spin border-2 border-green-600 border-t-transparent rounded-full w-4 h-4 inline-block"></span>
            ) : (
              <>Bulk Approve ({selectedIds?.filter((i) => i)?.length})</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
