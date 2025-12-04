import React, { createContext, useContext, useState } from "react";
import { useGetGoalPlanFrameworkSettings } from "../../hooks/useGoal";
type RequestLeaveDefaults = {
  fromDate?: string;
  toDate?: string;
  leaveType?: string;
  halfDay?: boolean;
  halfDayOption?: "First Half" | "Second Half";
  half_day_date?: string;
  custom_second_half_day_date?: string;
  description?: string;
  custom_reason?: string;
  custom_attachment?: { url: string }[];
  source?: "holiday" | "other";
  hideHalfDayToggle?: boolean;
  isEdit?: boolean;
  leave_application?: string;
};

type GoalModelContextType = {
  selectedGoalPlanId: string;
  setGoalPlanId: (id: string)=> void;
  showModal: boolean;
  openModal: (defaults?: RequestLeaveDefaults) => void;
  closeModal: () => void;
  selectedGoalPlanFramworkSettings: any;
  defaults: RequestLeaveDefaults | null;
};

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
  const setGoalPlanId = (id: string)=>{
    setSelectedGoalPlanId(id);
  }
  const { data: selectedGoalPlanFramworkSettings } = useGetGoalPlanFrameworkSettings(selectedGoalPlanId);

  return (
    <GoalModelContext.Provider
      value={{ selectedGoalPlanId, setGoalPlanId, selectedGoalPlanFramworkSettings, showModal, openModal, closeModal, defaults }}
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
