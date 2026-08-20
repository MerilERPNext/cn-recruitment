/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLoadingOverlay } from "../../context/OverlayContext";
import { useActionOnAttendanceRequest } from "../../hooks/useAttendance";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import {
  useIsRejectionReasonMandatory,
} from "../../hooks/useLeaves";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { useScreenSize } from "../../hooks/useScreenSize";
import { commentService } from "../../services/commentService";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { isActionEnabled } from "../../utils/uiPermission";
import { BulkActionFooter } from "../Attendance/TeamAttendanceDetails/BulkActionBar";
import DataListView, { FilterField } from "../DataListView";
import { useBulkSelectContext } from "./BulkSelectContext";
import ActionReasonModal from "./ActionReasonModal";

type ApprovalListProps = {
  uiPermission?: {
    app: string;
    page: string;
    actionKey: string;
  };
  doctype: string;
  renderCardContent: ({
    todoId,
    isSelected,
    onToggleSelect,
    data,
    onAction,
    loadingAction,
    isActed,
    onActed,
  }: {
    todoId: string;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    data: any;
    onAction: (action: string, data: any) => void;
    loadingAction: { id: string; action: string } | null;
    isActed: boolean;
    onActed: (id: string) => void;
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
  bulkSelectVisible?: boolean;
  defaultFilters?: Record<string, any>;
  columnWidths?: string[];
  orderBy?: string;
  noRecordsScreen?:
  | React.ReactNode
  | ((filters: Record<string, any>) => React.ReactNode);
  SkeletonComponent?: React.ComponentType;
  onActiveFiltersChange?: (filters: Record<string, any>) => void;
  onDataLoad?: (data: any[]) => void;
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
  uiPermission,
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
  bulkSelectVisible,
  defaultFilters,
  noRecordsScreen,
  SkeletonComponent,
  orderBy,
  onActiveFiltersChange,
  onDataLoad,
}: ApprovalListProps) => {
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>(() =>
    normalizeFilters(defaultFilters || {}),
  );

  const { data: user } = useCurrentUser();
  const { data: uiPermissionData } = useGetUiPermission(uiPermission?.app);
  const actionsEnabled = isActionEnabled(
    uiPermissionData,
    uiPermission?.actionKey ?? "",
    uiPermission?.page,
  );

  const handleFiltersChange = useCallback(
    (filters: Record<string, any>) => {
      const normalized = normalizeFilters(filters);
      setActiveFilters(normalized);
      if (onActiveFiltersChange) {
        onActiveFiltersChange(normalized);
      }
    },
    [onActiveFiltersChange],
  );

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

  const [selectedIds, setSelectedIds] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [actedIds, setActedIds] = useState<Set<string>>(new Set());

  const { data: isLeaveRejectionMandatory } = useIsRejectionReasonMandatory();
  const queryClient = useQueryClient();
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [showBulkCommentModal, setShowBulkCommentModal] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<
    "Approve" | "Reject" | null
  >(null);

  const addActedId = useCallback((id: string) => {
    setActedIds((prev) => new Set(prev).add(id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      if (id) addActedId(id);
    };
    document.addEventListener("approval:acted", handler);
    return () => document.removeEventListener("approval:acted", handler);
  }, [addActedId]);

  const currentStatus =
    activeFilters?.status ||
    activeFilters?.approval_status ||
    activeFilters?.custom_final_status ||
    activeFilters?.custom_status ||
    status;

  const statusBasedBulkEnable =
    currentStatus === "Open" ||
    currentStatus === "Pending" ||
    currentStatus === "Draft";

  // parent prop + internal logic combine
  // If a uiPermission actionKey is set but the action is disabled, always hide bulk select.
  const bulkAllowedByPermission = !uiPermission?.actionKey || actionsEnabled;
  const finalBulkSelectVisible = bulkAllowedByPermission
    ? typeof bulkSelectVisible === "boolean"
      ? bulkSelectVisible
      : statusBasedBulkEnable
    : false;

  useEffect(() => {
    onBulkSelectVisibilityChange?.(finalBulkSelectVisible);
  }, [finalBulkSelectVisible, onBulkSelectVisibilityChange]);

  const triggerRefetch = useCallback(() => {
    // Only fire one trigger. setRefetch is for the parent to push a refetch
    // inward — using both setters causes two separate renders (React state vs
    // Zustand store are different update systems), which makes refetchTrigger
    // flip to true twice and fires two API calls.
    setRefetchAttendance(true);
  }, [setRefetchAttendance]);

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
  }, [triggerRefetch]);

  useEffect(() => {
    const handleActed = (e: any) => {
      if (e.detail?.id) {
        addActedId(e.detail.id);
      }
    };
    document.addEventListener("approval:acted", handleActed);
    return () => {
      document.removeEventListener("approval:acted", handleActed);
    };
  }, [addActedId]);

  // Toggle single
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Toggle all
  const handleSelectAll = useCallback(() => {
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
  }, [selectedIds, allRequests]);

  const handleAction = useCallback(
    async (
      action: string,
      data: {
        todo_id: string;
        custom_open_chatnext_assistant_on_action: boolean;
        custom_approval_type: "Approval Matrix" | "Multi Actions";
      },
    ) => {
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

          addActedId(data?.todo_id);

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
            // toast.success(`Request ${action} Successfully!`);
            const actionMap: Record<string, string> = {
              Approve: "Approved",
              Reject: "Rejected",
            };

            const finalAction = actionMap[action] ?? `${action}ed`;

            toast.success(`Request ${finalAction} Successfully!`);
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
    [mutation, loading, triggerRefetch, addActedId],
  );

  const batchActionMutation = useActionOnAttendanceRequest();

  const handleBulkActionClick = (action: "Approve" | "Reject") => {
    if (["Approve", "Reject"].includes(action) && ["Leave Application", "Attendance Request", "Expense Claim", "Loan Application", "Employee Advance"].includes(doctype)) {
      let isMandatory = true;
      if (doctype === "Leave Application" && action === "Reject") {
        isMandatory = isLeaveRejectionMandatory?.message ?? true;
      }
      if (isMandatory) {
        setPendingBulkAction(action);
        setShowBulkCommentModal(true);
        return;
      }
    }
    handleBulkAction(action);
  };

  const handleSaveBulkComment = async (reason: string | null) => {
    try {
      setIsCommentSaving(true);
      const docInfos = selectedIds
        .map((id) => {
          const req = allRequests.find((r) => r.todo_id === id);
          const refDoc = req?.reference_document;
          const refDoctype = refDoc?.doctype || req?.reference_type || doctype;
          const refName = refDoc?.name || req?.reference_name;
          if (refDoctype && refName) return { doctype: refDoctype, name: refName };
          return null;
        })
        .filter(Boolean) as { doctype: string; name: string }[];

      if (docInfos.length > 0) {
        if (reason !== null) {
          await Promise.all(
            docInfos.map((docInfo) =>
              commentService.createApprovalComment({
                comment_type: pendingBulkAction === "Approve" ? "Submitted" : "Cancelled",
                reference_doctype: docInfo.doctype,
                reference_name: docInfo.name,
                comment_email: user?.name || "",
                comment_by: user?.name || "",
                content: reason,
                subject: pendingBulkAction === "Approve" ? "Request Approved" : "Request Rejected",
              }),
            ),
          );
        }

        queryClient.invalidateQueries({ queryKey: ["teamRequests"] });
        queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
        queryClient.invalidateQueries({ queryKey: ["attendance-request"] });
        queryClient.invalidateQueries({ queryKey: ["my-attendance-requests"] });
        queryClient.invalidateQueries({ queryKey: ["expense-claims"] });
        queryClient.invalidateQueries({ queryKey: ["todo"] });
        queryClient.invalidateQueries({ queryKey: ["todo-refdocs"] });
        queryClient.invalidateQueries({ queryKey: ["todo-approvals"] });
      }
      setShowBulkCommentModal(false);
      if (pendingBulkAction) {
        handleBulkAction(pendingBulkAction);
      }
    } catch (error) {
      console.error("Failed to save bulk comment", error);
    } finally {
      setIsCommentSaving(false);
    }
  };

  const handleCancelBulkComment = () => {
    setShowBulkCommentModal(false);
    setPendingBulkAction(null);
  };

  const handleBulkAction = useCallback(
    async (action: "Approve" | "Reject") => {
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
                  const ids = selectedIds.filter(Boolean);
                  setActedIds((prev) => {
                    const next = new Set(prev);
                    ids.forEach((id) => next.add(id));
                    return next;
                  });
                  toast.success(
                    `Requests ${action === "Reject"
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
      }, `${action} selected requests…`);
    },
    [loading, batchActionMutation, selectedIds, triggerRefetch],
  );

  // ── BulkSelectContext sync ───────────────────────────────────────────────
  // CardTable is a parent of ApprovalList so it can't receive a provider from
  // us — instead we write upward into the BulkSelectProvider that wraps both.
  //
  // Rule: only plain DATA goes into context STATE (to avoid re-render loops).
  // Function callbacks go into callbacksRef — ref writes are synchronous and
  // never trigger re-renders, so they can't cause infinite loops.
  const bulkCtx = useBulkSelectContext();
  const bulkSetState = bulkCtx?.setState; // stable Dispatch — safe as dep

  // Keep callbacks current in the ref on every render (cheap, no side-effects).
  if (bulkCtx?.callbacksRef) {
    bulkCtx.callbacksRef.current = {
      onSelectAll: handleSelectAll,
      onBulkAction: handleBulkAction,
    };
  }

  // Sync plain data into context state. No function refs in deps → no loop.
  useEffect(() => {
    if (!bulkSetState) return;
    bulkSetState({
      selectedIds,
      allRequests,
      isEnabled: finalBulkSelectVisible,
      bulkLoading,
    });
  }, [
    bulkSetState,
    selectedIds,
    allRequests,
    finalBulkSelectVisible,
    bulkLoading,
  ]);

  useEffect(() => {
    return () => {
      bulkSetState?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable callback — prevents DataListView's onDataLoad effect from firing
  // on every ApprovalList re-render (which would call setAllRequests → loop).
  const handleDataLoad = useCallback((data: any[]) => {
    setAllRequests(data);
    onDataLoad?.(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { isDesktop } = useScreenSize();

  const allSelected =
    allRequests.length > 0 && selectedIds.length === allRequests.length;

  return (
    <>
      <DataListView
        queryKey={["todo-approvals", doctype]}
        defaultFilters={defaultFilters || { status }}
        customAPI={{
          method: "cn_leave_shift_managment.api.get_open_approval_todos",
          params: {
            doctype: doctype,
            include_allocated_todos: true,
            fields: ["*"],
            ...activeFilters,
          },
        }}
        noRecordsScreen={
          typeof noRecordsScreen === "function"
            ? (filters: Record<string, any>) =>
              noRecordsScreen({ ...filters, ...activeFilters })
            : noRecordsScreen
        }
        onFiltersChange={handleFiltersChange}
        isSearch={isSearch}
        isFilter={isFilter}
        filterFields={filterFields}
        pageSize={pageSize}
        showPagination={showPagination}
        showRefreshButton={false}
        infiniteScroll={infiniteScroll}
        loadMorePagination={loadMorePagination}
        onDataLoad={handleDataLoad}
        SkeletonComponent={SkeletonComponent}
        orderBy={orderBy}
        PreListComponent={
          // On mobile the CardTable header is hidden, so we show a compact
          // select-all row. On desktop the checkbox lives in the CardTable
          // header via BulkSelectContext — nothing needed here.
          !isDesktop && finalBulkSelectVisible && allRequests.length > 0
            ? () => (
              <div className="flex items-center gap-3 px-4 py-2 bg-primary/20  mb-1">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="cursor-pointer w-4 h-4"
                />
                <span className="text-sm">Select all pending requests</span>
              </div>
            )
            : undefined
        }
        PostListComponent={
          // Renders between the last list item and the pagination row.
          // Only visible when at least one item is selected.
          finalBulkSelectVisible
            ? () => (
              <BulkActionFooter
                selectedIds={selectedIds}
                onBulkAction={handleBulkActionClick}
                loadingAction={bulkLoading}
              />
            )
            : undefined
        }
        renderItem={(item: any) => {
          const todoId = item?.todo_id;
          const isActed = actedIds.has(todoId);
          return (
            <div className={isActed ? "pointer-events-none opacity-50" : ""}>
              {renderCardContent({
                todoId: todoId,
                isSelected: selectedIds.includes(todoId),
                onToggleSelect: handleToggleSelect,
                data: item,
                onAction: handleAction,
                loadingAction: loadingAction,
                isActed,
                onActed: addActedId,
              })}
            </div>
          );
        }}
        refetchTrigger={refetch || refetchAttendance}
        onRefetchComplete={() => {
          setActedIds(new Set());
          setRefetchAttendance(false);

          if (setRefetch) {
            setRefetch(false);
          }

          if (onApprovalRefetchComplete) {
            onApprovalRefetchComplete();
          }
        }}
      />
      <ActionReasonModal
        isOpen={showBulkCommentModal}
        isPending={isCommentSaving}
        type={pendingBulkAction === "Approve" ? "approval" : "rejection"}
        title={
          pendingBulkAction === "Approve"
            ? selectedIds.length > 1
              ? "Bulk Approval Comment"
              : "Approval Comment"
            : selectedIds.length > 1
              ? "Bulk Rejection Reason"
              : "Rejection Reason"
        }
        description={
          pendingBulkAction === "Approve"
            ? `Please add a comment before approving ${
                selectedIds.length > 1
                  ? `these ${selectedIds.length} requests`
                  : "this request"
              }.`
            : `Please add a reason before rejecting ${
                selectedIds.length > 1
                  ? `these ${selectedIds.length} requests`
                  : "this request"
              }.`
        }
        label={
          pendingBulkAction === "Approve"
            ? "APPROVAL COMMENT *"
            : "REJECTION REASON *"
        }
        placeholder={
          pendingBulkAction === "Approve"
            ? "Enter approval comment..."
            : "Enter rejection reason..."
        }
        confirmTitle={
          pendingBulkAction === "Approve"
            ? selectedIds.length > 1
              ? `Confirm Approval (${selectedIds.length})`
              : "Confirm Approval"
            : selectedIds.length > 1
              ? `Confirm Rejection (${selectedIds.length})`
              : "Confirm Rejection"
        }
        confirmMessage={
          pendingBulkAction === "Approve"
            ? selectedIds.length > 1
              ? `Are you sure you want to approve all ${selectedIds.length} selected requests?`
              : "Are you sure you want to approve this request?"
            : selectedIds.length > 1
              ? `Are you sure you want to reject all ${selectedIds.length} selected requests?`
              : "Are you sure you want to reject this request?"
        }
        confirmButtonLabel={
          pendingBulkAction === "Approve"
            ? selectedIds.length > 1
              ? `Approve All (${selectedIds.length})`
              : "Approve"
            : selectedIds.length > 1
              ? `Reject All (${selectedIds.length})`
              : "Reject"
        }
        cancelButtonLabel="Cancel"
        todo_id={selectedIds[0]}
        onCancel={handleCancelBulkComment}
        onSave={handleSaveBulkComment}
      />
    </>
  );
};

export default ApprovalList;
