import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../../../shared/atoms/Button";
import CardTable from "../../../../shared/CardTable";
import { Typography } from "../../../../shared/atoms/Typography";
import { Select } from "../../../../shared/atoms/Select";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import { useApproveTeamGoals, useGetApprovelQueue, useRejectTeamGoals } from "../../../../../hooks/usePerformance";
import { CardSkeleton } from "../../../../shared/molecules/Skeletons/TableSkeleton";
import { getPerformanceErrorMessage } from "../../../../../services/performanceService";
import type { ApprovalQueueByEmployee, ApprovalQueueItem } from "../../../../../types/goal";
import {
  GoalApprovalItem,
  APPROVAL_TABLE_TITLES,
  APPROVAL_TABLE_COLUMN_WIDTHS,
} from "./GoalApprovalItem";
import EmployeeApprovalItem from "./EmployeeApprovalItem";
import { GoalReasonModal } from "./GoalReasonModal";

interface ApprovalQueueSectionProps {
  onGoalClick: (employee: string, goalKey: string) => void;
}

export const ApprovalQueueSection: React.FC<ApprovalQueueSectionProps> = memo(({
  onGoalClick,
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;
  const { mutate: approveTeamGoals, isPending } = useApproveTeamGoals();
  const { mutate: rejectGoal, isPending: rejectGoalLoading } = useRejectTeamGoals();

  const [checkedGoals, setCheckedGoals] = useState<Set<string>>(new Set());
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const onToggleCheck = useCallback((id: string) => {
    setCheckedGoals((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const [status, setStatus] = useState<string>("pending");
  const [start, setStart] = useState<number>(0);

  const clearSelection = useCallback(() => {
    setCheckedGoals(new Set());
  }, []);

  useEffect(() => {
    clearSelection();
  }, [status, start]);

  const { data: approvalQueueResponse, isLoading: queueLoading, error, refetch } = useGetApprovelQueue({
    status,
    start  });

  const queueData = approvalQueueResponse?.data;
  const queueItems: ApprovalQueueItem[] = queueData?.queue || [];
  const byEmployeeList: ApprovalQueueByEmployee[] = queueData?.by_employee || [];

  const selectedEmployees = useMemo(() => {
    const validIds = new Set<string>();
    queueItems.forEach((item) => item.employee && validIds.add(item.employee));
    byEmployeeList.forEach((item) => item.employee && validIds.add(item.employee));
    return Array.from(checkedGoals).filter((id) => validIds.has(id));
  }, [checkedGoals, queueItems, byEmployeeList]);

  const approveAllSelectedGoals = useCallback(() => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee.");
      return;
    }
    approveTeamGoals(
      { payload: { employees: selectedEmployees } },
      {
        onSuccess: (res) => {
          toast.success(res?.message || "Goal(s) approved successfully.");
          clearSelection();
        },
        onError: (err) => {
          toast.error(getPerformanceErrorMessage(err, "Failed to approve goals."));
        },
      }
    );
  }, [selectedEmployees, approveTeamGoals, clearSelection]);

  const rejectAllSelectedGoals = useCallback(
    (noteText: string) => {
      rejectGoal(
        { payload: { employees: selectedEmployees, note: noteText } },
        {
          onSuccess: (res) => {
            toast.success(res?.message || "Goal(s) rejected successfully.");
            setIsRejectModalOpen(false);
            clearSelection();
          },
          onError: (err) => {
            toast.error(getPerformanceErrorMessage(err, "Failed to reject goals."));
          },
        }
      );
    },
    [selectedEmployees, rejectGoal, clearSelection]
  );
  const isPlanAction = Boolean(queueData?.plan_action);
  const filters: string[] = queueData?.filters || ["pending", "all", "approved", "rejected", "sent_back"];
  const hasMore = Boolean(queueData?.has_more);

  const count = queueData?.count ?? queueItems.length ?? "-";
  const autoApproveNote = queueData?.auto_approve_note ?? "-";
  const bulkActions = queueData?.bulk_actions || [];
  const showRejectAll = bulkActions.some((act: string) => act.includes("reject"));
  const showApproveAll = bulkActions.some((act: string) => act.includes("approve"));
  const hasBulkAction = showRejectAll || showApproveAll;

  const backendLimit = queueData?.limit || 50;

  const filterOptions = useMemo(() => {
    return filters.map((filterKey: string) => ({
      label:
        filterKey === "sent_back"
          ? "Sent Back"
          : filterKey.charAt(0).toUpperCase() + filterKey.slice(1),
      value: filterKey,
    }));
  }, [filters]);

  const currentOption = useMemo(() => {
    return (
      filterOptions.find((opt) => opt.value === status) ||
      filterOptions[0] || { label: "Pending", value: "pending" }
    );
  }, [filterOptions, status]);

  const totalMatched = queueData?.matched ?? queueData?.count ?? (isPlanAction ? byEmployeeList.length : queueItems.length);
  const pageStart = start;
  const pageEnd = Math.min(start + backendLimit, totalMatched);
  const currentPage = Math.floor(start / backendLimit) + 1;
  const totalPages = Math.ceil(totalMatched / backendLimit) || 1;

  return (
    <section className="overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm">
      <div
        className={`flex ${
          isCompact ? "flex-col gap-3" : "items-center justify-between"
        } border-b border-amber-100 bg-amber-50 px-4 py-3 sm:px-5`}
      >
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <Typography
            variant="bodySmall"
            className="min-w-0 font-semibold text-amber-900"
          >
            Approval Queue — {count} goals awaiting you
          </Typography>
          {!isMobile && autoApproveNote && autoApproveNote !== "-" && (
            <Typography
              variant="caption"
              className="shrink-0 text-amber-800"
            >
              - {autoApproveNote}
            </Typography>
          )}
        </div>

        <div
          className={`flex gap-3 ${
            isCompact ? "w-full flex-col sm:w-auto sm:flex-row sm:items-center" : "items-center"
          }`}
        >
          {filterOptions.length > 0 && (
            <Select
              options={filterOptions}
              value={currentOption}
              onChange={(selectedOption) => {
                setStatus(selectedOption.value);
                setStart(0);
              }}
              className="w-36"
            />
          )}

          {selectedEmployees.length > 0 && (
            <span className="inline-flex items-center rounded-md bg-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-900 shrink-0">
              {selectedEmployees.length} Selected
            </span>
          )}

          {showRejectAll && (
            <Button
              variant="outline"
              bgColor="error"
              size="sm"
              disabled={rejectGoalLoading}
              onClick={() => {
                if (selectedEmployees.length === 0) {
                  toast.error("Please select at least one employee.");
                  return;
                }
                setIsRejectModalOpen(true);
              }}
              className={isCompact ? "w-full sm:w-fit" : ""}
            >
              {rejectGoalLoading
                ? "Rejecting selected..."
                : selectedEmployees.length > 0
                ? `Reject all selected (${selectedEmployees.length})`
                : "Reject all selected"}
            </Button>
          )}
          {showApproveAll && (
            <Button
              variant="contain"
              bgColor="success"
              size="sm"
              disabled={isPending}
              onClick={approveAllSelectedGoals}
              className={isCompact ? "w-full sm:w-fit" : ""}
            >
              {isPending
                ? "Approving selected..."
                : selectedEmployees.length > 0
                ? `Approve all selected (${selectedEmployees.length})`
                : "Approve all selected"}
            </Button>
          )}
          {!hasBulkAction && (
            <Typography variant="caption" className="text-amber-800 font-medium italic">
              No action
            </Typography>
          )}
        </div>
      </div>

      {isCompact ? (
        queueLoading ? (
          <div className="p-4">
            <CardSkeleton rows={2} />
          </div>
        ) : error ? (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <Typography variant="bodySmall" className="truncate">
                Failed to load approval queue. {getPerformanceErrorMessage(error, "An unexpected error occurred.")}
              </Typography>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="shrink-0 border-red-200 text-red-700 hover:bg-red-100"
            >
              Retry
            </Button>
          </div>
        ) : queueItems.length === 0 && byEmployeeList.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Typography variant="bodySmall">No goals pending approval.</Typography>
          </div>
        ) : isPlanAction && byEmployeeList.length > 0 ? (
          <div className="p-3 sm:p-4 pr-2 sm:pr-3 space-y-3 bg-slate-50/60 max-h-[500px] overflow-y-auto">
            {byEmployeeList.map((empGroup: ApprovalQueueByEmployee) => (
              <EmployeeApprovalItem
                key={empGroup.employee}
                empGroup={empGroup}
                checked={checkedGoals.has(empGroup.employee)}
                onToggleCheck={onToggleCheck}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3 sm:p-4 max-h-[500px] overflow-y-auto">
            {queueItems.map((item: ApprovalQueueItem) => {
              const itemId = item.employee || "";
              return (
                <GoalApprovalItem
                  key={itemId}
                  goal={item}
                  checked={checkedGoals.has(itemId)}
                  onToggleCheck={onToggleCheck}
                  onClick={onGoalClick}
                />
              );
            })}
          </div>
        )
      ) : queueLoading ? (
        <div className="p-4">
          <CardSkeleton rows={2} />
        </div>
      ) : error ? (
        <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <Typography variant="bodySmall" className="truncate">
              Failed to load approval queue. {getPerformanceErrorMessage(error, "An unexpected error occurred.")}
            </Typography>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="shrink-0 border-red-200 text-red-700 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      ) : queueItems.length === 0 && byEmployeeList.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Typography variant="bodySmall">No goals pending approval.</Typography>
        </div>
      ) : isPlanAction && byEmployeeList.length > 0 ? (
        <div className="p-3 sm:p-4 pr-2 sm:pr-3 space-y-3 bg-slate-50/60 max-h-[500px] overflow-y-auto border-t border-slate-100">
          {byEmployeeList.map((empGroup: ApprovalQueueByEmployee) => (
            <EmployeeApprovalItem
              key={empGroup.employee}
              empGroup={empGroup}
              checked={checkedGoals.has(empGroup.employee)}
              onToggleCheck={onToggleCheck}
            />
          ))}
        </div>
      ) : (
        <CardTable
          titles={APPROVAL_TABLE_TITLES}
          columnWidths={APPROVAL_TABLE_COLUMN_WIDTHS}
        >
          <div className="w-full max-h-[500px] overflow-y-auto">
            {queueItems.map((item: ApprovalQueueItem) => {
              const itemId = item.employee || "";
              return (
                <GoalApprovalItem
                  key={itemId}
                  goal={item}
                  checked={checkedGoals.has(itemId)}
                  onToggleCheck={onToggleCheck}
                  onClick={onGoalClick}
                />
              );
            })}
          </div>
        </CardTable>
      )}

      {!queueLoading && !error && (queueItems.length > 0 || byEmployeeList.length > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-white">
          <Typography variant="caption" className="text-slate-500">
            Showing <span className="font-semibold text-slate-900">{totalMatched > 0 ? pageStart + 1 : 0}</span> to{" "}
            <span className="font-semibold text-slate-900">{pageEnd}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalMatched}</span> {isPlanAction ? "reportees" : "items"}
          </Typography>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageStart === 0}
              onClick={() => setStart((prev) => Math.max(0, prev - backendLimit))}
              className="px-3 py-1 text-xs font-medium border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Previous
            </Button>

            <Typography variant="caption" className="font-semibold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </Typography>

            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore && pageEnd >= totalMatched}
              onClick={() => setStart((prev) => prev + backendLimit)}
              className="px-3 py-1 text-xs font-medium border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <GoalReasonModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={rejectAllSelectedGoals}
        title="Reject Selected Goals"
        description="Please enter a reason/note to reject goals for selected employee(s)."
        placeholder="Enter reason for rejection..."
        confirmText="Reject"
        loadingText="Rejecting..."
        confirmBgColor="error"
        isLoading={rejectGoalLoading}
      />
    </section>
  );
});

export default ApprovalQueueSection;
