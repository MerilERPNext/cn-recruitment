import { useState, ReactNode, useCallback, useEffect } from "react";
import DataListView from "../DataListView";
import { BulkActionBar } from "../Attendance/TeamAttendanceDetails/BulkActionBar";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import { useActionOnAttendanceRequest } from "../../hooks/useAttendance";
import toast from "react-hot-toast";
import { useGlobalStore } from "../../hooks/useGlobalStore";

type ApprovalListProps = {
  doctype: string;
  renderCardContent: ({
    todoId,
    isSelected,
    onToggleSelect,
    data,
    onAction,
    loadingAction,
  }: {
    todoId: string;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    data: any;
    onAction: (action: string, data: any) => void;
    loadingAction: { id: string; action: string } | null;
  }) => ReactNode;
  refetch?: boolean;
  setRefetch?: (value: boolean) => void;
  status: string;
  pageSize?: number;
  showPagination?: boolean;
  onApprovalRefetchComplete?: () => void;
};

const ApprovalList = ({
  doctype,
  status,
  renderCardContent,
  pageSize,
  refetch,
  setRefetch,
  onApprovalRefetchComplete,
  showPagination = true,
}: ApprovalListProps) => {
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const mutation = useApprovalListActions();
  const [loadingAction, setLoadingAction] = useState<{
    id: string;
    action: string;
  } | null>(null);
  const [bulkLoading, setBulkLoading] = useState<{
    action: "Approve" | "Reject";
    isLoading: boolean;
  } | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);

  const triggerRefetch = () => {
    if (setRefetch) {
      setRefetch(true);
    }
    setRefetchAttendance(true);
  };

  useEffect(() => {
    const handleChatClose = () => {
      triggerRefetch();
    };

    document.addEventListener("chatnext:modal:chat:close", handleChatClose);

    return () => {
      document.removeEventListener(
        "chatnext:modal:chat:close",
        handleChatClose
      );
    };
  }, []);
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
      setSelectedIds(
        allRequests.map((req) => {
          const actionsWithForm = req?.custom_doctype_actions_with_form
            ? JSON.parse(
                req?.custom_doctype_actions_with_form.replace(/'/g, '"')
              )
            : [];
          if (
            actionsWithForm?.includes("Approve") ||
            actionsWithForm?.includes("Reject")
          ) {
            return null;
          } else {
            return req.todo_id;
          }
        })
      );
    }
  };

  const handleAction = useCallback(async (action: string, data: any) => {
    try {
      if (mutation?.isPending) return;
      setLoadingAction({ id: data?.todo_id, action });
      const response = await mutation?.mutateAsync({
        action,
        name: data?.todo_id || "",
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
          window.trigger_chatnext_assistant(true, responseWithSession?.session);
        }
        if (action.toLowerCase() !== "approve") {
          triggerRefetch();
        }
      } else {
        triggerRefetch();
      }
      // Query invalidation now handled by Frappe realtime events
    } catch (error: any) {
      const exceptions = error?.response?.data?.exception?.split(":");
      const errMessage =
        exceptions?.length > 1
          ? exceptions[1] + " " + exceptions[2]
          : exceptions[1];
      console.error("Action failed", error);
      toast.error(errMessage);
    } finally {
      setLoadingAction(null);
    }
  }, [mutation, setLoadingAction, triggerRefetch]);

  const batchActionMutation = useActionOnAttendanceRequest();
  const handleBulkAction = (action: "Approve" | "Reject") => {
    try {
      setBulkLoading({ action, isLoading: true });
      batchActionMutation.mutate(
        {
          todo_ids: selectedIds?.filter((i) => i),
          selected_action: action,
        },
        {
          onSuccess: () => {
            toast.success(
              `Requests ${
                action === "Reject" ? "rejected" : action.toLowerCase()
              }d successfully!`
            );
            triggerRefetch();
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
    } finally {
      setBulkLoading(null);
    }
  };

  return (
    <div className="bg-white">
      <DataListView
        queryKey={["todo-approvals", doctype]}
        customAPI={{
          method: "cn_leave_shift_managment.api.get_open_approval_todos",
          params: {
            doctype: doctype,
            status: status,
            include_allocated_todos: true,
            fields: ["*"],
          },
        }}
        isSearch={false}
        isFilter={false}
        pageSize={pageSize}
        showPagination={showPagination}
        showRefreshButton={false}
        infiniteScroll={true}
        onDataLoad={(data) => setAllRequests(data)}
        PreListComponent={() => (
          <div className="mb-2 lg:mb-0 lg:mt-[-8px] sm:p-0">
            {(status === "Open" || status === "Pending") && (
              <BulkActionBar
                selectedIds={selectedIds}
                pendingRequests={allRequests}
                onSelectAll={handleSelectAll}
                onBulkAction={handleBulkAction}
                loadingAction={bulkLoading}
              />
            )}
          </div>
        )}
        ItemComponent={(props: { item: any }) => {
          const todoId = props.item?.todo_id;
          return renderCardContent({
            todoId: todoId,
            isSelected: selectedIds.includes(todoId),
            onToggleSelect: handleToggleSelect,
            data: props.item,
            onAction: handleAction,
            loadingAction: loadingAction,
          });
        }}
        refetchTrigger={refetch || refetchAttendance}
        onRefetchComplete={() => {
          setRefetchAttendance(false);

          if (setRefetch) {
            setRefetch(false);
          }

          if (onApprovalRefetchComplete) {
            onApprovalRefetchComplete();
          }
        }}
      />
    </div>
  );
};

export default ApprovalList;
