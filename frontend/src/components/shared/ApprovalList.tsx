import { useMemo, useState, ReactNode } from "react";
import FrappeListView from "../ListView";
import { BulkActionBar } from "../Attendance/TeamAttendanceDetails/BulkActionBar";

type ApprovalListProps = {
  doctype: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderCardContent: (item: any) => ReactNode;
};

const ApprovalList = ({ doctype, renderCardContent }: ApprovalListProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingRequests, setPendingRequests] = useState<any[]>([]); // will hold all items from list

  const defaultFilters = useMemo(
    () => ({ reference_type: doctype }),
    [doctype]
  );

  // Toggle selection for a given todoId
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Select all pending requests
  const handleSelectAll = () => {
    if (selectedIds.length === pendingRequests.length) {
      setSelectedIds([]); // unselect all
    } else {
      setSelectedIds(pendingRequests.map((req) => req.custom_funnel_task));
    }
  };

  // Bulk action handler
  const handleBulkAction = (action: "Approve" | "Reject") => {
    console.log("Bulk Action:", action, "on", selectedIds);
    // TODO: call frappe API or mutation here
    // After success: clear selection or refresh list
    setSelectedIds([]);
  };

  return (
    <div>
      <BulkActionBar
        selectedIds={selectedIds}
        pendingRequests={pendingRequests}
        onSelectAll={handleSelectAll}
        onBulkAction={handleBulkAction}
      />

      <FrappeListView
        doctype="ToDo"
        isSearch={false}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ItemComponent={(props: { item: any }) => {
          const todoId = props?.item?.custom_funnel_task;
          return (
            <ActionCard
              todoId={todoId}
              isSelected={selectedIds.includes(todoId)}
              onToggleSelect={handleToggleSelect}
              data={props.item}
            >
              {renderCardContent(props.item)}
            </ActionCard>
          );
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defaultFilters={defaultFilters as any}
        showRefereshButton={false}
        // onItemClick={() => {}}
        infiniteScroll={true}
        isFilter={false}
        defaultFields={["*"]}
        onItemClick={(data) => setPendingRequests(data)}
      />
    </div>
  );
};

export default ApprovalList;

type ActionCardProps = {
  todoId: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  isActionedCard?: boolean;
  onToggleSelect?: (id: string) => void;
  children: ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

function ActionCard({
  isSelected = false,
  isActionedCard = true,
  isDisabled = false,
  onToggleSelect,
  children,
  data,
}: ActionCardProps) {
  return (
    <div className="cursor-pointer border border-gray-200 bg-white shadow-sm rounded-xl transition-shadow">
      <div className="p-4 flex items-start gap-3 w-full">
        {isActionedCard && (
          <input
            type="checkbox"
            className="mt-1 accent-blue-500"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelect?.(data?.custom_funnel_task)}
            disabled={isDisabled}
          />
        )}

        <div className="w-full">
          <div>{children}</div>
          <div className="flex gap-2 mt-2">
            {data?.custom_doctype_actions &&
              JSON.parse(data?.custom_doctype_actions)?.map(
                (action: string) => (
                  <button
                    key={action}
                    className="bg-blue-100 text-blue-600 rounded-md text-sm px-2 py-1"
                  >
                    {action}
                  </button>
                )
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
