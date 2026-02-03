/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, ReactNode, useCallback, useEffect } from "react";
import DataListView, { FilterField } from "../DataListView";
import { BulkActionBar } from "../Attendance/TeamAttendanceDetails/BulkActionBar";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import { useActionOnAttendanceRequest } from "../../hooks/useAttendance";
import toast from "react-hot-toast";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { useLoadingOverlay } from "../../context/OverlayContext";

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
  status?: string;
  pageSize?: number;
  showPagination?: boolean;
  onApprovalRefetchComplete?: () => void;
  infiniteScroll?: boolean;
  loadMorePagination?: boolean;
  filterFields?: FilterField[];
  isFilter?: boolean;
  isSearch?: boolean;
  onBulkSelectVisibilityChange?: (enabled: boolean) => void;
  defaultFilters?: Record<string, any>;
  columnWidths?: string[];
};

const normalizeFilters = (filters: Record<string, any>) => {
  const normalized: Record<string, any> = {};

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (
      typeof value === "object" &&
      value !== null &&
      ("name" in value || "value" in value)
    ) {
      normalized[key] = value.name || value.value;
    } else {
      normalized[key] = value;
    }
  });

  return normalized;
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
  infiniteScroll = true,
  loadMorePagination = false,
  filterFields,
  isFilter = false,
  isSearch = false,
  onBulkSelectVisibilityChange,
  defaultFilters,
  columnWidths,
}: ApprovalListProps) => {
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  const handleFiltersChange = useCallback((filters: Record<string, any>) => {
    const normalized = normalizeFilters(filters);
    setActiveFilters(normalized);
  }, []);

  const loading = useLoadingOverlay();

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

  const currentStatus = activeFilters?.status || status;

  const isBulkSelectEnabled =
    currentStatus === "Open" ||
    currentStatus === "Pending" ||
    currentStatus === "Draft";

  useEffect(() => {
    onBulkSelectVisibilityChange?.(isBulkSelectEnabled);
  }, [isBulkSelectEnabled, onBulkSelectVisibilityChange]);

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
        handleChatClose,
      );
    };
  }, []);
  // Toggle single
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
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
                req?.custom_doctype_actions_with_form.replace(/'/g, '"'),
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
        }),
      );
    }
  };

  const handleAction = useCallback(
    async (action: string, data: any) => {
      if (mutation?.isPending) return;

      const actionLoadingShow = ["approve", "reject"].includes(
        action.toLocaleLowerCase(),
      )
        ? action
        : `Performing Action: ${action}`;
      await loading?.wrap(async () => {
        try {
          setLoadingAction({ id: data?.todo_id, action });

          const response = await mutation.mutateAsync({
            action,
            name: data?.todo_id || "",
          });

          console.log("Action response:", response);
          const responseWithSession = response as unknown as { session?: any };
          console.log("Session data:", responseWithSession?.session);
          console.log(
            "Assistant trigger enabled:",
            data?.custom_open_chatnext_assistant_on_action,
          );

          if (
            (data?.custom_approval_type === "Approval Matrix" &&
              responseWithSession?.session) ||
            (data?.custom_approval_type === "Multi Actions" &&
              data?.custom_open_chatnext_assistant_on_action)
          ) {
            console.log(
              "Opening assistant with session:",
              responseWithSession?.session,
            );

            if (window.trigger_chatnext_assistant) {
              window.trigger_chatnext_assistant(
                true,
                responseWithSession?.session,
              );
            }

            if (action.toLowerCase() !== "approve") {
              triggerRefetch();
            }
          } else {
            toast.success("Approved Request Successfully!");
            triggerRefetch();
          }
        } catch (error: any) {
          const formatedError = errorResponseFormater(
            error,
            "Something went wrong",
          );
          toast.error(formatedError);
          console.error("Action Falied:", error);
        } finally {
          setLoadingAction(null);
        }
      }, actionLoadingShow);
    },
    [mutation, loading, triggerRefetch],
  );

  const batchActionMutation = useActionOnAttendanceRequest();
  const handleBulkAction = async (action: "Approve" | "Reject") => {
    await loading?.wrap(async () => {
      try {
        setBulkLoading({ action, isLoading: true });

        await new Promise<void>((resolve, reject) => {
          batchActionMutation.mutate(
            {
              todo_ids: selectedIds.filter(Boolean),
              selected_action: action,
            },
            {
              onSuccess: () => {
                toast.success(
                  `Requests ${
                    action === "Reject"
                      ? "rejected"
                      : `${action.toLowerCase()}d`
                  } successfully!`,
                );
                triggerRefetch();
                resolve();
              },
              onError: (error) => {
                toast.error(errorResponseFormater(error));
                console.error(error);
                reject(error);
              },
            },
          );
        });

        setSelectedIds([]);
      } finally {
        setBulkLoading(null);
      }
    }, `${action}ing selected requests…`);
  };

  return (
    <div>
      <DataListView
        queryKey={["todo-approvals", doctype]}
        defaultFilters={defaultFilters || { status }}
        customAPI={{
          method: "cn_leave_shift_managment.api.get_open_approval_todos",
          params: {
            doctype: doctype,
            include_allocated_todos: true,
            fields: ["*"],
            // status: status,
            // ...activeFilters,
          },
        }}
        // onFiltersChange={(filters) => {
        //   setActiveFilters(filters);
        // }}
        onFiltersChange={handleFiltersChange}
        isSearch={isSearch}
        isFilter={isFilter}
        filterFields={filterFields}
        pageSize={pageSize}
        showPagination={showPagination}
        showRefreshButton={false}
        infiniteScroll={infiniteScroll}
        loadMorePagination={loadMorePagination}
        onDataLoad={(data) => setAllRequests(data)}
        PreListComponent={() => (
          <div className="mb-2 lg:mb-0 lg:mt-[-8px] sm:p-0">
            {isBulkSelectEnabled && (
              <BulkActionBar
                selectedIds={selectedIds}
                pendingRequests={allRequests}
                onSelectAll={handleSelectAll}
                onBulkAction={handleBulkAction}
                loadingAction={bulkLoading}
                 columnWidths={columnWidths}
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
