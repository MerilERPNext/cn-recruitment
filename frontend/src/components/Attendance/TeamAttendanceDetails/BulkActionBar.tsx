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
        {/* Checkbox column (table aligned) */}
        <input type="checkbox" checked={allSelected} onChange={onSelectAll} />
        {/* Content column (spans all except checkbox visually) */}
        <div className="flex flex-col" style={{ gridColumn: "2 / -1" }}>
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
      </div>
    </div>
  );
}

// ─── Footer variant ──────────────────────────────────────────────────────────
// Renders only the action buttons, pinned to the bottom of the table.
// Used as PostListComponent in ApprovalList when inside a CardTable.

interface BulkActionFooterProps {
  selectedIds: string[];
  onBulkAction: (action: "Approve" | "Reject") => void;
  loadingAction: { action: "Approve" | "Reject"; isLoading: boolean } | null;
}

export function BulkActionFooter({
  selectedIds,
  onBulkAction,
  loadingAction,
}: BulkActionFooterProps) {
  const selectedCount = selectedIds.filter(Boolean).length;
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-0 left-0 z-20 bg-white border-t border-gray-200 px-6 py-3 flex items-center gap-3 justify-end">
      <span className="text-sm text-gray-600 mr-2">
        {selectedCount} selected
      </span>

      <Button
        variant="soft"
        bgColor="error"
        onClick={() => onBulkAction("Reject")}
        disabled={loadingAction?.isLoading && loadingAction?.action === "Reject"}
      >
        {loadingAction?.isLoading && loadingAction?.action === "Reject" ? (
          <span className="animate-spin border-2 border-red-600 border-t-transparent rounded-full w-4 h-4 inline-block" />
        ) : (
          <>Bulk Reject ({selectedCount})</>
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
          <span className="animate-spin border-2 border-green-600 border-t-transparent rounded-full w-4 h-4 inline-block" />
        ) : (
          <>Bulk Approve ({selectedCount})</>
        )}
      </Button>
    </div>
  );
}
