import React from "react";
import { SimpleNominationPanel } from "./SimpleNominationPanel";
import AssignedEmployeesList from "./AssignedEmployeesList";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useQueryClient } from "@tanstack/react-query";

interface ProgramExpansionPanelProps {
  awardName: string;
  onCollapse: () => void;
  /** Inactive programs render the nomination form read-only. */
  isActive?: boolean;
}

/**
 * Expanded view shown when an active program card is clicked. It renders the
 * nomination form whose eligible-employee list is driven by
 * `recognition_eligibility.get_eligible_receivers` (employee, program) via
 * SimpleNominationPanel.
 */
export const ProgramExpansionPanel: React.FC<ProgramExpansionPanelProps> = ({
  awardName,
  isActive = true,
}) => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });

  const handleNominationSuccess = () => {
    // Every recognition query key starts with "recognition", so this also
    // refreshes the assigned-employees list below without a page reload.
    queryClient.invalidateQueries({ queryKey: ["recognition"] });
  };

  return (
    <div className="mt-2 p-4 rounded-xl border border-gray-100 bg-gray-50">
      {!isActive && (
        <p className="mb-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
          This program is inactive. Nominations are closed.
        </p>
      )}

      <SimpleNominationPanel
        awardName={awardName}
        onSuccess={handleNominationSuccess}
        disabled={!isActive}
      />

      <AssignedEmployeesList
        program={awardName}
        employee={currentUser?.employee}
      />
    </div>
  );
};
