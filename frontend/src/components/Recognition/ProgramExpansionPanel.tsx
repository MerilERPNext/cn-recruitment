import React from "react";
import { SimpleNominationPanel } from "./SimpleNominationPanel";
import { useQueryClient } from "@tanstack/react-query";

interface ProgramExpansionPanelProps {
  awardName: string;
  onCollapse: () => void;
}

/**
 * Expanded view shown when an active program card is clicked. It renders the
 * nomination form whose eligible-employee list is driven by
 * `recognition_eligibility.get_eligible_receivers` (employee, program) via
 * SimpleNominationPanel.
 */
export const ProgramExpansionPanel: React.FC<ProgramExpansionPanelProps> = ({
  awardName,
}) => {
  const queryClient = useQueryClient();

  const handleNominationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["recognition"] });
  };

  return (
    <div className="mt-2 p-4 rounded-xl border border-gray-100 bg-gray-50">
      <SimpleNominationPanel
        awardName={awardName}
        onSuccess={handleNominationSuccess}
      />
    </div>
  );
};
