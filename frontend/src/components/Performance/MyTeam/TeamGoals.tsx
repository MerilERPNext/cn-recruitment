import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { APPROVAL_GOALS, GOAL_DETAIL, TEAM_MEMBERS } from "./mockData";
import { GoalDetailData } from "./types";
import { GoalHeader } from "./components/TeamGoals/GoalHeader";
import { ApprovalQueueSection } from "./components/TeamGoals/ApprovalQueueSection";
import { AllTeamGoalsSection } from "./components/TeamGoals/AllTeamGoalsSection";
import { GoalDetailModal } from "./components/TeamGoals/GoalDetailModal";
import { useGetTeamGoals } from "../../../hooks/usePerformance";

const TeamGoals: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useScreenSize();
   const {data:teamGoals , isLoading , error} = useGetTeamGoals()
  const card = teamGoals?.data?.cards
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

  const totalGoals = 32;
  const totalReportees = 8;
  const pendingApproval = APPROVAL_GOALS.length;

  const toggleCheck = (id: string) => {
    setCheckedGoals((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <main
      className={`min-h-full overflow-y-auto overflow-x-hidden bg-[#f6f8fb] font-sans ${
        isMobile ? "px-3 py-4" : "p-1"
      }`}
    >
      <div className="mx-auto w-full space-y-4 sm:space-y-5">
        <GoalHeader
          card={card}
        />

        <ApprovalQueueSection
          goals={APPROVAL_GOALS}
          checkedGoals={checkedGoals}
          onToggleCheck={toggleCheck}
          onGoalClick={handleGoalClick}
        />

        <AllTeamGoalsSection
          totalGoals={card?.goals ?? totalGoals}
          groups={teamGoals?.data?.groups}
          health={teamGoals?.data?.health}
          members={TEAM_MEMBERS}
          onGoalClick={handleGoalClick}
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
