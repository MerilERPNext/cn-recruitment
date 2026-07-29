import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { GoalTemplate, getGoalKey } from "./GoalCreation/component/goal-model/types";
import {
  DraftGoalItem,
  RequestLeaveDefaults,
  GoalModelContextType,
} from "../../types/goal";

export type { DraftGoalItem, RequestLeaveDefaults, GoalModelContextType };

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
  const [draftGoals, setDraftGoals] = useState<DraftGoalItem[]>(() => {
    try {
      const saved = localStorage.getItem("performance_draft_goals");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("performance_draft_goals", JSON.stringify(draftGoals));
    } catch (e) {
      console.error("Failed to save draft goals to localStorage", e);
    }
  }, [draftGoals]);

  const addDraftGoals = useCallback((goals: GoalTemplate | GoalTemplate[]) => {
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
    try {
      localStorage.removeItem("performance_draft_goals");
    } catch (e) {
      console.error("Failed to clear draft goals from localStorage", e);
    }
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

