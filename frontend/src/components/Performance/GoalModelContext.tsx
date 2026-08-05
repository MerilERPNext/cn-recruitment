import React, { createContext, useContext, useState, useCallback } from "react";
import { GoalTemplate, getGoalKey } from "./GoalCreation/component/goal-model/types";
import {
  DraftGoalItem,
  RequestLeaveDefaults,
  GoalModelContextType,
  CascadeGoal,
} from "../../types/goal";


const GoalModelContext = createContext<
  GoalModelContextType | undefined
>(undefined);

export const GoalModelProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [showModal, setShowModal] = useState(false);
  const [defaults, setDefaults] = useState<RequestLeaveDefaults | null>(null);
  const openModal = (data?: RequestLeaveDefaults) => {
    setDefaults(data || null);
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);
  const [selectedGoalPlanId, setSelectedGoalPlanId] = useState("");
  const setGoalPlanId = (id: string) => {
    setSelectedGoalPlanId(id);
  };

  // Draft goals state initialized from localStorage
  const [draftGoals, setDraftGoals] = useState<(DraftGoalItem | CascadeGoal)[]>([]);


  const addDraftGoals = useCallback((goals: GoalTemplate | CascadeGoal | (GoalTemplate | CascadeGoal)[]) => {
    const goalArray = Array.isArray(goals) ? goals : [goals];
    setDraftGoals((prev) => {
      const existingKeys = new Set(prev.map((g) => getGoalKey(g)));
      const newItems = goalArray
        .filter((g) => !existingKeys.has(getGoalKey(g)))
        .map((g) => ({ ...g, weightage: (g as DraftGoalItem).weightage || 10 }));
      return [...prev, ...newItems];
    });
  }, []);

  const removeDraftGoal = useCallback((id: string) => {
    setDraftGoals((prev) => prev.filter((g) => getGoalKey(g) !== id));
  }, []);

  const updateDraftGoalWeightage = useCallback((id: string, weightage: number) => {
    setDraftGoals((prev) =>
      prev.map((g) => (getGoalKey(g) === id ? { ...g, weightage } : g))
    );
  }, []);

  const clearDraftGoals = useCallback(() => {
    setDraftGoals([]);
  }, []);

  return (
    <GoalModelContext.Provider
      value={{
        selectedGoalPlanId,
        setGoalPlanId,
        showModal,
        openModal,
        closeModal,
        defaults,
        draftGoals,
        setDraftGoals,
        addDraftGoals,
        removeDraftGoal,
        updateDraftGoalWeightage,
        clearDraftGoals,
      }}
    >
      {children}
    </GoalModelContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useGoalModel = (): GoalModelContextType => {
  const context = useContext(GoalModelContext);
  if (!context) {
    throw new Error(
      "useGoalModel must be used within a GoalModelProvider"
    );
  }
  return context;
};

