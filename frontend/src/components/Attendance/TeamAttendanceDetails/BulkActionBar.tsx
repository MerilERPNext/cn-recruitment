import { BulkActionProps } from "../../../types/attendance";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";

export function BulkActionBar({
  selectedIds,
  pendingRequests,
  onSelectAll,
  onBulkAction,
  loadingAction,
  columnWidths,
}: BulkActionProps) {
  if (pendingRequests.length === 0) return null;

  const allSelected = selectedIds.length === pendingRequests.length;
  const gridTemplateColumns = columnWidths?.join(" ");

  const selectedCount = selectedIds?.filter((i) => i)?.length || 0;

  return (
    <div className="bg-primary/20">
      <div
        className="grid items-center gap-4 px-6 py-3"
        style={gridTemplateColumns ? { gridTemplateColumns } : undefined}
      >
        {/* Content column (spans all except checkbox visually) */}
        <div className="col-span-full flex flex-col">
          <Typography variant="bodyMedium">
            Select all pending requests
          </Typography>

          <Typography variant="bodySmall" color="body2">
            Note - Requests which require other actions are not selectable for
            bulk approval
          </Typography>

          {selectedCount > 0 && (
            <div className="flex gap-2 mt-2">
              {/* Bulk Reject */}
              <Button
                variant="soft"
                bgColor="error"
                onClick={() => onBulkAction("Reject")}
                disabled={
                  loadingAction?.isLoading && loadingAction?.action === "Reject"
                }
              >
                {loadingAction?.isLoading &&
                loadingAction?.action === "Reject" ? (
                  <span className="animate-spin border-2 border-red-600 border-t-transparent rounded-full w-4 h-4 inline-block" />
                ) : (
                  <>Bulk Reject ({selectedCount})</>
                )}
              </Button>

              {/* Bulk Approve */}
              <Button
                variant="soft"
                bgColor="success"
                onClick={() => onBulkAction("Approve")}
                disabled={
                  loadingAction?.isLoading &&
                  loadingAction?.action === "Approve"
                }
              >
                {loadingAction?.isLoading &&
                loadingAction?.action === "Approve" ? (
                  <span className="animate-spin border-2 border-green-600 border-t-transparent rounded-full w-4 h-4 inline-block" />
                ) : (
                  <>Bulk Approve ({selectedCount})</>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Checkbox column (table aligned) */}
        <div className="flex justify-center">
          <input type="checkbox" checked={allSelected} onChange={onSelectAll} />
        </div>
      </div>
    </div>
  );
}
