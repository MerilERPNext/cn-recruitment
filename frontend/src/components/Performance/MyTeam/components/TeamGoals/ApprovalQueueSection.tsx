import React from "react";
import Button from "../../../../shared/atoms/Button";
import CardTable from "../../../../shared/CardTable";
import DataListView from "../../../../DataListView";
import { Typography } from "../../../../shared/atoms/Typography";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import type { FrappePageResponse } from "../../../../../types/frappe";
import {
  GoalApprovalItem,
  APPROVAL_TABLE_TITLES,
  APPROVAL_TABLE_COLUMN_WIDTHS,
} from "./GoalApprovalItem";

interface ApprovalQueueSectionProps {
  goals: any[];
  checkedGoals: Set<string>;
  onToggleCheck: (id: string) => void;
  onGoalClick: (goal: any) => void;
}

export const ApprovalQueueSection: React.FC<ApprovalQueueSectionProps> = ({
  goals,
  checkedGoals,
  onToggleCheck,
  onGoalClick,
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  const fetchApprovalGoals = React.useCallback(async (): Promise<FrappePageResponse> => {
    return {
      data: goals as unknown as FrappePageResponse["data"],
      totalCount: goals.length,
      hasNextPage: false,
      pages: [],
    };
  }, [goals]);

  return (
    <section className="overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm">
      <div
        className={`flex ${
          isCompact ? "flex-col gap-3" : "items-center justify-between"
        } border-b border-amber-100 bg-amber-50 px-4 py-4 sm:px-5`}
      >
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <Typography
            variant="bodySmall"
            className="min-w-0 font-semibold text-amber-900"
          >
            Approval Queue — {goals.length} goals awaiting you
          </Typography>
          {!isMobile && (
            <Typography
              variant="caption"
              className="shrink-0 text-amber-800"
            >
              - auto-approve in 2 days if no action
            </Typography>
          )}
        </div>
        <div
          className={`flex gap-3 ${
            isCompact ? "w-full flex-col sm:w-auto sm:flex-row" : "items-center"
          }`}
        >
          <Button
            variant="outline"
            bgColor="error"
            size="sm"
            className={isCompact ? "w-full sm:w-fit" : ""}
          >
            Reject all
          </Button>
          <Button
            variant="contain"
            bgColor="success"
            size="sm"
            className={isCompact ? "w-full sm:w-fit" : ""}
          >
            Approve all
          </Button>
        </div>
      </div>

      {isCompact ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3 sm:p-4">
          <DataListView
            queryKey="team-approval-goals-mobile"
            fetchFunction={fetchApprovalGoals}
            isSearch={false}
            showPagination={false}
            showRefreshButton={false}
            pageSize={goals.length}
            infiniteScroll={false}
            loadMorePagination={false}
            enableUrlParams={false}
            getItemKey={(item: any) => item.id}
            ItemComponent={({ item }: { item: any }) => (
              <GoalApprovalItem
                goal={item}
                checked={checkedGoals.has(item.id)}
                onToggleCheck={() => onToggleCheck(item.id)}
                onClick={() => onGoalClick(item)}
              />
            )}
          />
        </div>
      ) : (
        <CardTable
          titles={APPROVAL_TABLE_TITLES}
          columnWidths={APPROVAL_TABLE_COLUMN_WIDTHS}
        >
          <div className="w-full min-w-[1080px]">
            <DataListView
              queryKey="team-approval-goals"
              fetchFunction={fetchApprovalGoals}
              isSearch={false}
              showPagination={false}
              showRefreshButton={false}
              pageSize={goals.length}
              infiniteScroll={false}
              loadMorePagination={false}
              enableUrlParams={false}
              getItemKey={(item: any) => item.id}
              ItemComponent={({ item }: { item: any }) => (
                <GoalApprovalItem
                  goal={item}
                  checked={checkedGoals.has(item.id)}
                  onToggleCheck={() => onToggleCheck(item.id)}
                  onClick={() => onGoalClick(item)}
                />
              )}
            />
          </div>
        </CardTable>
      )}
    </section>
  );
};

export default ApprovalQueueSection;
