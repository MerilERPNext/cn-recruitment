import { BulkActionProps } from "../../../types/attendance";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";

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
    <div className="p-2 px-6 bg-primary/20 cursor-pointer rounded-xl lg:rounded-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input type="checkbox" checked={allSelected} onChange={onSelectAll} />
          <Typography variant="bodySmall">
            Select all pending requests
          </Typography>
        </div>
      </div>
      <Typography variant="label" color="body2">
        Note - Requests which require other actions are not selectable for bulk
        approval
      </Typography>

      {selectedIds.length > 0 && (
        <div className="flex space-x-2 mt-2">
          <Button
            variant="soft"
            bgColor="error"
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
          </Button>

          <Button
            variant="soft"
            bgColor="success"
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
          </Button>
        </div>
      )}
    </div>
  );
}
