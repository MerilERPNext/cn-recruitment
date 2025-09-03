/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, ReactNode, useCallback } from "react";
import FrappeListView from "../ListView";
import { BulkActionBar } from "../Attendance/TeamAttendanceDetails/BulkActionBar";
import { useApprovalListActions } from "../../hooks/userApprovalList";

type ApprovalListProps = {
  doctype: string;
  renderCardContent: ({
    todoId,
    isSelected,
    onToggleSelect,
    data,
    refetch,
    onAction,
  }: {
    todoId: string;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    data: any;
    refetch: () => void;
    onAction: (action: string, data: any) => void;
  }) => ReactNode;
  pageSize?: number;
};

const ApprovalList = ({
  doctype,
  renderCardContent,
  pageSize,
}: ApprovalListProps) => {
  const [refetchListView, setRefetchListView] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const defaultFilters = useMemo(
    () => ({ reference_type: doctype, status: "open" }),
    [doctype]
  );

  // Toggle single
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Toggle all
  const handleSelectAll = () => {
    if (selectedIds.length === allRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allRequests.map((req) => req.custom_funnel_task));
    }
  };

  // Bulk approve/reject
  const handleBulkAction = (action: "Approve" | "Reject") => {
    console.log("Bulk Action:", action, selectedIds);
    // TODO: frappe API call here
    setSelectedIds([]); // reset selection after action
  };

  const mutation = useApprovalListActions();

  const handleAction = useCallback(
    async (action: string, data: any) => {
      try {
        if (mutation?.isPending) return;
        const response = await mutation?.mutateAsync(
          {
            action,
            name: data?.name || "",
          },
          {
            onSuccess: () => {
              setRefetchListView((prev) => !prev);
            },
          }
        );

        console.log("Action response:", response);
        const responseWithSession = response as unknown as { session?: any };
        console.log("Session data:", responseWithSession?.session);
        console.log(
          "Assistant trigger enabled:",
          data?.custom_open_chatnext_assistant_on_action
        );

        if (
          (data?.custom_approval_type === "Approval Matrix" &&
            responseWithSession?.session) ||
          (data?.custom_approval_type === "Multi Actions" &&
            data?.custom_open_chatnext_assistant_on_action)
        ) {
          console.log(
            "Opening assistant with session:",
            responseWithSession?.session
          );
          if (window.trigger_chatnext_assistant) {
            window.trigger_chatnext_assistant(
              true,
              responseWithSession?.session
            );
          }
        }
        // Query invalidation now handled by Frappe realtime events
      } catch (error) {
        console.error("Action failed", error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="px-4 py-2 bg-white">
      <FrappeListView
        doctype="ToDo"
        isSearch={false}
        defaultFilters={defaultFilters as any}
        showRefereshButton={false}
        infiniteScroll
        isFilter={false}
        defaultFields={["*"]}
        pageSize={pageSize}
        onDataLoad={(data) => setAllRequests(data)}
        PreListComponent={() => (
          <div className="mb-2">
            <BulkActionBar
              selectedIds={selectedIds}
              pendingRequests={allRequests}
              onSelectAll={handleSelectAll}
              onBulkAction={handleBulkAction}
            />
          </div>
        )}
        ItemComponent={(props: { item: any }) => {
          const todoId = props.item?.custom_funnel_task;
          return renderCardContent({
            todoId: todoId,
            isSelected: selectedIds.includes(todoId),
            onToggleSelect: handleToggleSelect,
            data: props.item,
            refetch: () => {},
            onAction: handleAction,
          });
        }}
        refetchTrigger={refetchListView}
      />
    </div>
  );
};

export default ApprovalList;
