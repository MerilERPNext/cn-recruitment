import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge, { type BadgeVariant } from "../../../../shared/Badge";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import Button from "../../../../shared/atoms/Button";
import type { TeamGoalGroup, TeamGoalsHealth } from "../../../../../types/goal";
import useDebounce from "../../../../../hooks/useDebounce";
import { useGetTeamGoals } from "../../../../../hooks/usePerformance";
import TeamGoalDetailModal, { type SelectedGoalDetail } from "./TeamGoalDetailModal";
import TeamGoalGroupCard from "./TeamGoalGroupCard";
import { TeamGoalsListSkeleton } from "./TeamGoalsSkeleton";
import { TeamGoalsError } from "./TeamGoalsError";
import { getPerformanceErrorMessage } from "../../../../../services/performanceService";

interface AllTeamGoalsSectionProps {
  totalGoals?: number;
  groups?: TeamGoalGroup[];
  health?: TeamGoalsHealth;
  count?: number;
  matched?: number;
  start?: number;
  limit?: number;
  hasMore?: boolean;
  searchValue?: string;
  isLoading?: boolean;
  error?: unknown;
  onSearchChange?: (val: string) => void;
  onGoalClick?: (goal: any) => void;
  onPageChange?: (page: number) => void;
}

export const AllTeamGoalsSection: React.FC<AllTeamGoalsSectionProps> = () => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 10;
  const start = (page - 1) * limit;

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data: teamGoalsData, isLoading, error } = useGetTeamGoals({
    start,
    limit,
    search: debouncedSearch || undefined,
  });

  const groups = teamGoalsData?.data?.groups || [];
  const health = teamGoalsData?.data?.health;
  const count = teamGoalsData?.data?.count;
  const matched = teamGoalsData?.data?.matched;
  const hasMore = teamGoalsData?.data?.has_more ?? false;
  const totalGoals = teamGoalsData?.data?.cards?.goals ?? matched ?? groups.length;

  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<SelectedGoalDetail | null>(null);

  useEffect(() => {
    if (groups && groups.length > 0) {
      const firstWithGoals = groups.find((g) => g.goal_count > 0) || groups[0];
      if (firstWithGoals) {
        setExpandedMembers(new Set([firstWithGoals.employee]));
      }
    }
  }, [groups]);

  const toggleMember = useCallback((id: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedGoalDetail(null);
  }, []);

  const totalReporteesCount = matched ?? count ?? groups.length;
  const totalPages = Math.max(1, Math.ceil(totalReporteesCount / limit));

  const startItem = totalReporteesCount === 0 ? 0 : start + 1;
  const endItem = Math.min(start + limit, totalReporteesCount);

  const handlePrevPage = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    if (hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const statusSummary = useMemo(
    () =>
      health
        ? [
          { label: `${health.on_track} On-track`, variant: "success" as BadgeVariant },
          { label: `${health.at_risk} At-risk`, variant: "warning" as BadgeVariant },
          { label: `${health.off_track} Off-track`, variant: "danger" as BadgeVariant },
        ]
        : [
          { label: "0 On-track", variant: "success" as BadgeVariant },
          { label: "0 At-risk", variant: "warning" as BadgeVariant },
          { label: "0 Off-track", variant: "danger" as BadgeVariant },
        ],
    [health]
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <header
        className={`mb-4 flex min-w-0 ${
          isCompact ? "flex-col gap-3" : "items-start justify-between gap-4"
        }`}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <Typography variant="h4" className="font-bold text-slate-950">
              All Team Goals
            </Typography>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {totalGoals}
            </span>
          </div>
          <Typography variant="caption" className="text-slate-500">
            Approved & in progress · grouped by reportee
          </Typography>
        </div>
        <div className={`flex flex-wrap items-center gap-3 ${isCompact ? "w-full flex-col sm:flex-row" : "shrink-0 justify-end"}`}>
          <div className={`relative ${isCompact ? "w-full" : "w-48 sm:w-56"}`}>
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee..."
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-8 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {statusSummary.map((item) => (
              <Badge
                key={item.label}
                label={item.label}
                variant={item.variant}
                size="sm"
              />
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-3">
        {isLoading ? (
          <TeamGoalsListSkeleton />
        ) : error ? (
          <TeamGoalsError
            message={getPerformanceErrorMessage(error, "Failed to load team goals")}
          />
        ) : groups.length > 0 ? (
          groups.map((group: TeamGoalGroup) => (
            <TeamGoalGroupCard
              key={group.employee}
              employee={group.employee}
              group={group}
              isExpanded={expandedMembers.has(group.employee)}
              isCompact={isCompact}
              onToggle={toggleMember}
              onSelectGoal={setSelectedGoalDetail}
            />
          ))
        ) : (
          <div className="py-6 text-center text-xs italic text-slate-400">
            No reportees or team goals found.
          </div>
        )}
      </div>

      {totalReporteesCount > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4 px-2 bg-white">
          <Typography variant="caption" className="text-slate-500">
            Showing <span className="font-semibold text-slate-700">{startItem}</span> to{" "}
            <span className="font-semibold text-slate-700">{endItem}</span> of{" "}
            <span className="font-semibold text-slate-700">{totalReporteesCount}</span> reportees
          </Typography>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={handlePrevPage}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </Button>
            <Typography variant="caption" className="font-semibold text-slate-700 px-2">
              Page {page} of {totalPages}
            </Typography>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={handleNextPage}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {selectedGoalDetail && (
        <TeamGoalDetailModal 
          goal={selectedGoalDetail}
          onClose={handleCloseModal}
        />
      )}
    </section>
  );
};

export default AllTeamGoalsSection;
