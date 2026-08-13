import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Typography } from "../../../shared/atoms/Typography";
import { useEmployeeGoalsCheckIn, useMyGoals } from "../../../../hooks/usePerformance";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import type { MyGoalsGoal } from "../../../../types/goal";
import { ErrorState, EmployeeGoalsSkeleton } from "./TeamTrackingStates";
import { EmployeeGoalCard } from "./EmployeeGoalCard";
import { getPerformanceErrorMessage } from "../../../../services/performanceService";

interface EmployeeGoalsListProps {
  employeeId?: string;
  onSelectGoal?: (id: string) => void;
}

export const EmployeeGoalsList = ({
  employeeId,
}: EmployeeGoalsListProps) => {
  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });

  const {
    data: myGoalsResponse,
    isLoading,
    isFetched: isEmpGoalsFetched,
    isError,
    error,
    refetch,
  } = useMyGoals(employeeId ? { employee: employeeId } : undefined);

  const { data: sessionUserGoals } = useMyGoals(undefined, {
    enabled: isEmpGoalsFetched && (!myGoalsResponse?.data?.goals || myGoalsResponse.data.goals.length === 0),
  });

  const hasEmpGoals = (myGoalsResponse?.data?.goals?.length ?? 0) > 0;

  const goalsList: MyGoalsGoal[] = useMemo(
    () => (hasEmpGoals ? (myGoalsResponse?.data?.goals ?? []) : sessionUserGoals?.data?.goals ?? []),
    [hasEmpGoals, myGoalsResponse, sessionUserGoals]
  );

  const { mutate: employeCheckIn, isPending } = useEmployeeGoalsCheckIn();
  const [loadingGoalKey, setLoadingGoalKey] = useState<string | null>(null);
  const [openGoalKey, setOpenGoalKey] = useState<string | null>(null);

  const submitCheckIns = useCallback(
    (goalKey: string) => {
      setLoadingGoalKey(goalKey);
      const targetEmployeeId = hasEmpGoals
        ? (employeeId ?? currentEmployee?.name ?? "")
        : (currentEmployee?.name ?? "");

      employeCheckIn(
        {
          employee: targetEmployeeId,
          goal: goalKey,
        },
        {
          onSuccess: (res) => {
            toast.success(res?.message?.message || "Check-in requested successfully!");
          },
          onError: (err) => {
            toast.error(getPerformanceErrorMessage(err, "Failed to request check-in."));
          },
          onSettled: () => {
            setLoadingGoalKey(null);
          },
        }
      );
    },
    [employeCheckIn, hasEmpGoals, employeeId, currentEmployee]
  );

  if (isLoading) {
    return <EmployeeGoalsSkeleton />;
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={refetch} />;
  }

  if (!goalsList || goalsList.length === 0) {
    return (
      <div className="text-center py-12">
        <Typography variant="body" className="text-gray-500">
          No goals found for this employee.
        </Typography>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {goalsList.map((goal, idx) => {
        const goalIdentifier = goal?.goal_key || goal?.goal || goal?.name || String(idx);
        const isGoalPending = isPending && loadingGoalKey === goalIdentifier;
        const isExpanded = openGoalKey === goalIdentifier;

        return (
          <EmployeeGoalCard
            key={goalIdentifier}
            goal={goal}
            isGoalPending={isGoalPending}
            onRequestCheckIn={submitCheckIns}
            isExpanded={isExpanded}
            onToggleExpand={() => setOpenGoalKey(isExpanded ? null : goalIdentifier)}
          />
        );
      })}
    </div>
  );
};
