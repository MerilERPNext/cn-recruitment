import React from "react";
import Button from "../../../../shared/atoms/Button";
import CardTable from "../../../../shared/CardTable";
import CustomDropdown from "../../../../shared/CustomDropdown";
import DataListView from "../../../../DataListView";
import { Typography } from "../../../../shared/atoms/Typography";
import { OverviewTeamMember } from "../../types";
import type { FrappePageResponse } from "../../../../../types/frappe";
import { TeamMemberItem, TEAM_TABLE_COLUMN_WIDTHS } from "./TeamMemberItem";

const TEAM_TABLE_TITLES = [
  "Employee",
  "Goals",
  "Progress",
  "Self",
  "My Review",
  "Last Rating",
  "Action",
];

const STATUS_OPTIONS = [
  { label: "All status", value: "all" },
  { label: "Done", value: "done" },
  { label: "Pending", value: "pending" },
  { label: "Overdue", value: "overdue" },
];

const SORT_OPTIONS = [
  { label: "Sort: progress", value: "progress" },
  { label: "Sort: name", value: "name" },
  { label: "Sort: rating", value: "rating" },
];

interface TeamTableProps {
  isCompact: boolean;
  members: OverviewTeamMember[];
}

const TeamTable: React.FC<TeamTableProps> = ({ isCompact, members }) => {
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [selectedSort, setSelectedSort] = React.useState("progress");
  const fetchMembers = React.useCallback(async (): Promise<FrappePageResponse> => {
    return {
      data: members as unknown as FrappePageResponse["data"],
      totalCount: members.length,
      hasNextPage: false,
      pages: [],
    };
  }, [members]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white pt-4 shadow-sm">
      <div
        className={`flex ${isCompact ? "flex-col gap-3" : "items-center justify-between"} px-4 pb-4 sm:px-5 lg:px-6`}
      >
        <div className="flex items-center gap-3">
          <Typography
            variant="label"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-600"
          >
            8
          </Typography>
          <div className="min-w-0">
            <Typography variant="bodySmall" className="font-semibold text-slate-950">
              Team reviews
            </Typography>
            <Typography variant="caption" className="text-slate-500">
              Track reportee progress and review status
            </Typography>
          </div>
        </div>
        <div className={`flex items-center gap-3 ${isCompact ? "flex-wrap w-full" : ""}`}>
          <CustomDropdown
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            options={STATUS_OPTIONS}
            position="bottom-right"
            className={isCompact ? "flex-1" : ""}
          />
          <CustomDropdown
            value={selectedSort}
            onChange={(event) => setSelectedSort(event.target.value)}
            options={SORT_OPTIONS}
            position="bottom-right"
            className={isCompact ? "flex-1" : ""}
          />
          <Button
            variant="contain"
            bgColor="primary"
            className={`${isCompact ? "w-full" : "px-4 py-2"} justify-center rounded-lg bg-[#1a73e8] text-xs font-semibold hover:bg-blue-600`}
          >
            Nudge 2 overdue
          </Button>
        </div>
      </div>

      {isCompact ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3 sm:p-4">
          <DataListView<OverviewTeamMember>
            queryKey="team-overview-members-mobile"
            fetchFunction={fetchMembers}
            isSearch={false}
            showPagination={false}
            showRefreshButton={false}
            pageSize={members.length}
            infiniteScroll={false}
            loadMorePagination={false}
            enableUrlParams={false}
            getItemKey={(item) => item.id}
            ItemComponent={({ item }) => <TeamMemberItem item={item} />}
          />
        </div>
      ) : (
        <CardTable
          titles={TEAM_TABLE_TITLES}
          columnWidths={TEAM_TABLE_COLUMN_WIDTHS}
        >
          <div className="w-full min-w-[1080px]">
            <DataListView<OverviewTeamMember>
              queryKey="team-overview-members"
              fetchFunction={fetchMembers}
              isSearch={false}
              showPagination={false}
              showRefreshButton={false}
              pageSize={members.length}
              infiniteScroll={false}
              loadMorePagination={false}
              enableUrlParams={false}
              getItemKey={(item) => item.id}
              ItemComponent={({ item }) => <TeamMemberItem item={item} />}
            />
          </div>
        </CardTable>
      )}
    </section>
  );
};

export default TeamTable;
