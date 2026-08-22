import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { GoalHeader } from "./components/TeamGoals/GoalHeader";
import { ApprovalQueueSection } from "./components/TeamGoals/ApprovalQueueSection";
import { AllTeamGoalsSection } from "./components/TeamGoals/AllTeamGoalsSection";
import { GoalDetailModal } from "./components/TeamGoals/GoalDetailModal";

const TeamGoals: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useScreenSize();

  const [checkedGoals, setCheckedGoals] = useState<Set<string>>(new Set());
  const [selectedGoal, setSelectedGoal] = useState<{ employee: string; goalKey: string } | null>(null);

  const handleGoalClick = (employee: string, goalKey: string) => {
    setSelectedGoal({ employee, goalKey });
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
          checkedGoals={checkedGoals}
          onToggleCheck={toggleCheck}
          onGoalClick={handleGoalClick}
        />

        <AllTeamGoalsSection />
      </div>

      {selectedGoal && (
        <GoalDetailModal
          employee={selectedGoal.employee}
          goalKey={selectedGoal.goalKey}
          onClose={() => setSelectedGoal(null)}
          onApprove={handleApproveGoal}
        />
      )}
    </main>
  );
};

export default TeamGoals;
