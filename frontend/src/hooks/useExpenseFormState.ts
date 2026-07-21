/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useRef, useEffect } from "react";
import { ExpenseNavigationExpense } from "../components/Expenses-App/ExpenseClaim/expenseNavigationHelper";

export interface UseExpenseFormStateProps {
  initialExpense?: ExpenseNavigationExpense | null;
  isEditingExistingExpense: boolean;
  setOcrStatus: (status: any) => void;
  setOcrSummary: (summary: any) => void;
  setIsManualMode: (manual: boolean) => void;
  setIsSharePanelOpen: (open: boolean) => void;
}

export const useExpenseFormState = ({
  initialExpense,
  isEditingExistingExpense,
  setOcrStatus,
  setOcrSummary,
  setIsManualMode,
  setIsSharePanelOpen,
}: UseExpenseFormStateProps) => {
  const [selectedExpenseType, setSelectedExpenseType] = useState<string>("");
  const [mainFormData, setMainFormData] = useState<Record<string, any>>({});
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, any>>({});
  const [dynamicFormRevision, setDynamicFormRevision] = useState(0);
  const hydrationRef = useRef(Boolean(initialExpense));

  useEffect(() => {
    if (hydrationRef.current || isEditingExistingExpense) return;

    if (!selectedExpenseType) {
      setMainFormData({});
      setDynamicFormData({});
      setIsSharePanelOpen(false);
      setOcrStatus("idle");
      setOcrSummary({ amount: "", merchant: "", expense_date: "" });
      setIsManualMode(false);
    }
  }, [
    isEditingExistingExpense,
    selectedExpenseType,
    setOcrStatus,
    setOcrSummary,
    setIsManualMode,
    setIsSharePanelOpen,
  ]);

  return {
    selectedExpenseType,
    setSelectedExpenseType,
    mainFormData,
    setMainFormData,
    dynamicFormData,
    setDynamicFormData,
    dynamicFormRevision,
    setDynamicFormRevision,
    hydrationRef,
  };
};
