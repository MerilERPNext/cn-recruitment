import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";
import useDebounce from "../../../hooks/useDebounce";
import { APPROVAL_GOALS, GOAL_DETAIL } from "./mockData";
import { GoalDetailData } from "./types";
import { GoalHeader } from "./components/TeamGoals/GoalHeader";
import { ApprovalQueueSection } from "./components/TeamGoals/ApprovalQueueSection";
import { AllTeamGoalsSection } from "./components/TeamGoals/AllTeamGoalsSection";
import { GoalDetailModal } from "./components/TeamGoals/GoalDetailModal";
import { useGetTeamGoals } from "../../../hooks/usePerformance";


const TeamGoals: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useScreenSize();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 10;
  const start = (page - 1) * limit;

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data: teamGoals, isLoading, error } = useGetTeamGoals({
    start,
    limit,
    search: debouncedSearch || undefined,
  });
  const card = teamGoals?.data?.cards;
  const [checkedGoals, setCheckedGoals] = useState<Set<string>>(
    new Set(APPROVAL_GOALS.filter((g) => g.checked).map((g) => g.id))
  );
  const [selectedGoal, setSelectedGoal] = useState<GoalDetailData | null>(null);

  const handleGoalClick = (baseGoal: any) => {
    setSelectedGoal({
      ...GOAL_DETAIL,
      id: baseGoal.id,
      title: baseGoal.title,
      status: baseGoal.status || "Submitted",
      employeeName: baseGoal.employeeName,
      employeeInitials: baseGoal.employeeInitials,
      weightage: baseGoal.weightage || GOAL_DETAIL.weightage,
    });
  };

  const handleApproveGoal = () => {
    setSelectedGoal(null);
    navigate("/webapp/performance-app/team-goals/assign-goal");
  };

  const toggleCheck = (id: string) => {
    setCheckedGoals((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <main
      className={`min-h-full overflow-y-auto overflow-x-hidden bg-[#f6f8fb] font-sans ${isMobile ? "px-3 py-4" : "p-1"
        }`}
    >
      <div className="mx-auto w-full space-y-4 sm:space-y-5">
        <GoalHeader />

        <ApprovalQueueSection
          goals={APPROVAL_GOALS}
          checkedGoals={checkedGoals}
          onToggleCheck={toggleCheck}
          onGoalClick={handleGoalClick}
        />

        <AllTeamGoalsSection
          isLoading={isLoading}
          error={error}
          totalGoals={card?.goals}
          groups={teamGoals?.data?.groups}
          health={teamGoals?.data?.health}
          count={teamGoals?.data?.count}
          matched={teamGoals?.data?.matched}
          start={teamGoals?.data?.start}
          limit={teamGoals?.data?.limit}
          hasMore={teamGoals?.data?.has_more}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </div>

      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onApprove={handleApproveGoal}
        />
      )}
    </main>
  );
};

export default TeamGoals;

