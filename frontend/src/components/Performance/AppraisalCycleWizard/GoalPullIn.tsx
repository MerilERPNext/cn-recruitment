import { useState } from "react";
import AutoRating from "./components/GoalPullIn/AutoRating";
import SourceSettings from "./components/GoalPullIn/SourceSettings";

const GoalPullIn = () => {
  const [autoPull, setAutoPull] = useState(true);
  const [carryWeightage, setCarryWeightage] = useState(true);
  const [editLock, setEditLock] = useState(true);
  const [globalAutoRating, setGlobalAutoRating] = useState(true);

  return (
    <>
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
    </>
  );
};

export default GoalPullIn;
