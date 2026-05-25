import { useState } from "react";
import { useNavigate } from "react-router-dom";
import WizardShell from "./WizardShell";
import { mockWizardData } from "./AppraisalCycleWizard";
import SourceSettings from "./components/GoalPullIn/SourceSettings";
import AutoRating from "./components/GoalPullIn/AutoRating";

const GoalPullIn = () => {
  const navigate = useNavigate();
  const [autoPull, setAutoPull] = useState(true);
  const [carryWeightage, setCarryWeightage] = useState(true);
  const [editLock, setEditLock] = useState(true);
  const [globalAutoRating, setGlobalAutoRating] = useState(true);

  const goalPullInData = {
    ...mockWizardData,
    activeStepId: "goal-pull-in",
    header: {
      title: "Goal Pull-in",
      description: "Map approved goals into the appraisal form and define how progress translates to ratings.",
    },
    validationStatus: "Validation passed",
    nextStepLabel: "Normalisation & Calibration (Skip to Step 9)",
  };
  
  return (
    <WizardShell
      data={goalPullInData}
      onNext={() => navigate("/webapp/performance-app/appraisal-cycle-wizard/normalisation-calibration")}
      contentClassName="flex flex-col gap-4 sm:gap-6"
    >
      <SourceSettings
        autoPull={autoPull}
        setAutoPull={setAutoPull}
        carryWeightage={carryWeightage}
        setCarryWeightage={setCarryWeightage}
        editLock={editLock}
        setEditLock={setEditLock}
      />

      <AutoRating
        globalAutoRating={globalAutoRating}
        setGlobalAutoRating={setGlobalAutoRating}
      />
    </WizardShell>
  );
};

export default GoalPullIn;
