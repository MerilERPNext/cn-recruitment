/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, ReactNode, useCallback, useEffect } from "react";
import FrappeListView from "../ListView";
import { BulkActionBar } from "../Attendance/TeamAttendanceDetails/BulkActionBar";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import { useActionOnAttendanceRequest } from "../../hooks/useAttendance";
import toast from "react-hot-toast";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import useCurrentUser from "../../hooks/useCurrentUser";

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
  pageSize?: number;
  showPagination?: boolean;
  onApprovalRefetchComplete?: () => void;
};

const ApprovalList = ({
  doctype,
  renderCardContent,
  pageSize,
  refetch,
  onApprovalRefetchComplete,
  showPagination = true,
}: ApprovalListProps) => {
  const { data: currentUser } = useCurrentUser();

  const { setRefetchAttendance } = useGlobalStore();
  const mutation = useApprovalListActions();
  const [refetchListView, setRefetchListView] = useState(false);
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
  const defaultFilters = useMemo(
    () => ({
      allocated_to: currentUser?.name,
      reference_type: doctype,
      status: "open",
    }),
    [doctype, currentUser?.name]
  );
  useEffect(() => {
    const handleChatClose = () => {
      setRefetchListView((prev) => !prev);
    };

    document.addEventListener("chatnext:modal:chat:close", handleChatClose);

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener(
        "chatnext:modal:chat:close",
        handleChatClose
      );
    };
  }, []);

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
      setSelectedIds(
        allRequests.map((req) => {
          if (req?.custom_doctype_actions_with_form?.length > 0) {
            return null;
          } else {
            return req.name;
          }
        })
      );
    }
  };

  const handleAction = useCallback(
    async (action: string, data: any) => {
      try {
        if (mutation?.isPending) return;
        setLoadingAction({ id: data?.name, action });
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
          if (action.toLowerCase() !== "approve") {
            setRefetchListView((prev) => !prev);
          }
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

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
            // refetch();
            toast.success(
              `Requests ${
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
    } finally {
      setBulkLoading(null);
    }
  };

  return (
    <div className="bg-white">
      <FrappeListView
        doctype="ToDo"
        isSearch={false}
        defaultFilters={defaultFilters as any}
        showRefereshButton={false}
        infiniteScroll
        isFilter={false}
        defaultFields={["*"]}
        pageSize={pageSize}
        showPagination={showPagination}
        onDataLoad={(data) => setAllRequests(data)}
        PreListComponent={() => (
          <div className="mb-2 lg:mb-0 lg:mt-[-8px] sm:p-0">
            <BulkActionBar
              selectedIds={selectedIds}
              pendingRequests={allRequests}
              onSelectAll={handleSelectAll}
              onBulkAction={handleBulkAction}
              loadingAction={bulkLoading}
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
            loadingAction: loadingAction,
          });
        }}
        refetchTrigger={refetchListView}
        onRefetchComplete={() => {
          setRefetchListView(false);
          setRefetchAttendance(false);
          if (onApprovalRefetchComplete) {
            onApprovalRefetchComplete();
          }
        }}
      />
    </div>
  );
};

export default ApprovalList;
