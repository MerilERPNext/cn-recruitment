import React, { useMemo, useState } from "react";
import { AlertCircle, Loader2, Search } from "lucide-react";
import Button from "../../../../shared/atoms/Button";
import CardTable from "../../../../shared/CardTable";
import CustomDropdown from "../../../../shared/CustomDropdown";
import { Typography } from "../../../../shared/atoms/Typography";
import useDebounce from "../../../../../hooks/useDebounce";
import { useGetTeamMembers } from "../../../../../hooks/usePerformance";
import type { TeamMembersSortOption, TeamMembersStatusFilter } from "../../../../../types/goal";
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

const FILTER_LABEL_MAP: Record<string, string> = {
  all: "All status",
  no_plan: "No plan",
  pending_approval: "Pending approval",
  off_track: "Off track",
  checkin_due: "Check-in due",
  on_track: "On track",
};

const DEFAULT_FILTERS = [
  "all",
  "no_plan",
  "pending_approval",
  "off_track",
  "checkin_due",
  "on_track",
];

const SORT_OPTIONS = [
  { label: "Sort: progress", value: "progress" },
  { label: "Sort: progress desc", value: "progress_desc" },
  { label: "Sort: name", value: "name" },
  { label: "Sort: check-in", value: "checkin" },
  { label: "Sort: off-track", value: "off_track" },
];

interface TeamTableProps {
  isCompact: boolean;
}

const TeamTable: React.FC<TeamTableProps> = ({ isCompact }) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<string>("progress");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: teamMembersData, isLoading, error } = useGetTeamMembers({
    status: selectedStatus as TeamMembersStatusFilter,
    sort: selectedSort as TeamMembersSortOption,
    search: debouncedSearch,
  });

  const members = teamMembersData?.data?.members || [];
  const totalCount = teamMembersData?.data?.total ?? members.length;
  const overdueCount = teamMembersData?.data?.summary?.checkin_due ?? 0;

  const statusOptions = useMemo(() => {
    const filterList = teamMembersData?.data?.filters || DEFAULT_FILTERS;
    return filterList.map((f) => ({
      label: FILTER_LABEL_MAP[f] || f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: f,
    }));
  }, [teamMembersData?.data?.filters]);

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
            {totalCount}
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
          <div className={`relative ${isCompact ? "w-full" : "w-48 sm:w-56"}`}>
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee..."
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <CustomDropdown
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            options={statusOptions}
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
            Nudge {overdueCount} overdue
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <Typography variant="bodySmall">Loading team members...</Typography>
        </div>
      ) : error ? (
        <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <Typography variant="bodySmall">
            Failed to load team members. {error?.message}
          </Typography>
        </div>
      ) : members.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Typography variant="bodySmall">No team members found.</Typography>
        </div>
      ) : isCompact ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3 sm:p-4">
          {members.map((member) => (
            <TeamMemberItem key={member.employee} item={member} />
          ))}
        </div>
      ) : (
        <CardTable
          titles={TEAM_TABLE_TITLES}
          columnWidths={TEAM_TABLE_COLUMN_WIDTHS}
        >
          <div className="w-full min-w-[1080px]">
            {members.map((member) => (
              <TeamMemberItem key={member.employee} item={member} />
            ))}
          </div>
        </CardTable>
      )}
    </section>
  );
};

export default TeamTable;
