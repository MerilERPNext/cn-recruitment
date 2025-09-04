/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, ReactNode, useCallback, useEffect } from "react";
import FrappeListView from "../ListView";
import { BulkActionBar } from "../Attendance/TeamAttendanceDetails/BulkActionBar";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import { useActionOnAttendanceRequest } from "../../hooks/useAttendance";
import toast from "react-hot-toast";

type ApprovalListProps = {
  doctype: string;
  renderCardContent: ({
    todoId,
    isSelected,
    onToggleSelect,
    data,
    onAction,
  }: {
    todoId: string;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    data: any;
    onAction: (action: string, data: any) => void;
  }) => ReactNode;
  refetch?: boolean;
  pageSize?: number;
  onApprovalRefetchComplete?: () => void;
};

const ApprovalList = ({
  doctype,
  renderCardContent,
  pageSize,
  refetch,
  onApprovalRefetchComplete,
}: ApprovalListProps) => {
  const mutation = useApprovalListActions();
  const [refetchListView, setRefetchListView] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const defaultFilters = useMemo(
    () => ({ reference_type: doctype, status: "open" }),
    [doctype]
  );

  useEffect(() => {
    if (refetch) {
      setRefetchListView(true);
    }
  }, [refetch]);
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
      setSelectedIds(allRequests.map((req) => req.name));
    }
  };

  const handleAction = useCallback(
    async (action: string, data: any) => {
      try {
        if (mutation?.isPending) return;
        const response = await mutation?.mutateAsync({
          action,
          name: data?.name || "",
        });

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
        setRefetchListView((prev) => !prev);
        toast.success(
          `Attendance request ${
            action === "Reject" ? "rejecte" : action.toLowerCase()
          }d successfully!`
        );
        // Query invalidation now handled by Frappe realtime events
      } catch (error: any) {
        const exceptions = error?.response?.data?.exception?.split(":");
        const errMessage =
          exceptions?.length > 1
            ? exceptions[1] + " " + exceptions[2]
            : exceptions[1];
        console.error("Action failed", error);
        toast.error(errMessage);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const batchActionMutation = useActionOnAttendanceRequest();
  const handleBulkAction = (action: "Approve" | "Reject") => {
    try {
      batchActionMutation.mutate(
        {
          todo_ids: selectedIds,
          selected_action: action,
        },
        {
          onSuccess: () => {
            // refetch();
            toast.success(
              `Attendance requests ${
                action === "Reject" ? "rejecte" : action.toLowerCase()
              }d successfully!`
            );
            setRefetchListView((prev) => !prev);
          },
          onError: (error) => {
            toast.error(error?.message);
            console.error(error);
          },
        }
      );
      setSelectedIds([]);
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
  };

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
          const todoId = props.item?.name;
          return renderCardContent({
            todoId: todoId,
            isSelected: selectedIds.includes(todoId),
            onToggleSelect: handleToggleSelect,
            data: props.item,
            onAction: handleAction,
          });
        }}
        refetchTrigger={refetchListView}
        onRefetchComplete={() => {
          setRefetchListView(false);
          if (onApprovalRefetchComplete) {
            onApprovalRefetchComplete();
          }
        }}
      />
    </div>
  );
};

export default ApprovalList;
