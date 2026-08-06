import { useState } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import { Card } from "../../../shared/atoms/Card";
import Badge from "../../../shared/Badge";
import Button from "../../../shared/atoms/Button";
import { useEmployeeGoalsCheckIn } from "../../../../hooks/usePerformance";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import type { MyGoalsGoal } from "../../../../types/goal";
import { ErrorState, EmployeeGoalsSkeleton } from "./TeamTrackingStates";

const getStatusVariant = (status?: string) => {
  if (!status) return "default";
  const s = status.toLowerCase();
  if (s === "completed" || s === "on track" || s === "approved") return "success";
  if (s === "at risk" || s === "pending" || s === "draft") return "warning";
  if (s === "off-track" || s === "rejected") return "danger";
  return "info";
};

interface EmployeeGoalsListProps {
  goalsList: MyGoalsGoal[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  employeeId?: string;
  onSelectGoal?: (id: string) => void;
}

export const EmployeeGoalsList = ({
  goalsList,
  isLoading,
  isError,
  error,
  onRetry,
  onSelectGoal,
}: EmployeeGoalsListProps) => {
  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { mutate: employeCheckIn, isPending } = useEmployeeGoalsCheckIn();
  const [loadingGoalKey, setLoadingGoalKey] = useState<string | null>(null);

  const submitCheckIns = (goalKey: string) => {
    setLoadingGoalKey(goalKey);
    employeCheckIn(
      {
        employee: currentEmployee?.name ?? "",
        goal: goalKey,
      },
      {
        onSettled: () => {
          setLoadingGoalKey(null);
        },
      }
    );
  };

  if (isLoading) {
    return <EmployeeGoalsSkeleton />;
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={onRetry} />;
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
      {goalsList.map((goal) => {
        const goalId = goal.goal_key || goal.name || goal.title;
        const isGoalPending = isPending && loadingGoalKey === goal.goal_key;

        return (
          <Card
            key={goalId}
            className="p-5 border border-gray-100 hover:border-blue-300 hover:shadow-md  transition-all bg-white group"
            onClick={() => onSelectGoal?.(goalId)}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
              <div className="min-w-0 space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    label={goal?.goal_type || "-"}
                    variant="purple"
                    size="sm"
                  />
                  <Badge
                    label={goal?.status ?? "-"}
                    variant={getStatusVariant(goal.status)}
                    size="sm"
                  />
                  {goal?.weightage && (
                    <Badge
                      label={`${goal.weightage}%`}
                      variant="info"
                      size="sm"
                    />
                  )}
                </div>
                <div>
                  <Typography
                    variant="body"
                    className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors mb-1 truncate"
                  >
                    {goal.title}
                  </Typography>
                  {goal.description && (
                    <Typography
                      variant="bodySmall"
                      className="text-gray-500 truncate"
                    >
                      {goal.description}
                    </Typography>
                  )}
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                    Last check in {goal?.checkin_due ?? "--"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-5 shrink-0 self-end sm:self-center">
                <Button
                  variant="outline"
                  disabled={isGoalPending}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 font-medium text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={(e) => {
                    e.stopPropagation();
                    submitCheckIns(goal.goal_key);
                  }}
                >
                  {isGoalPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      Checking in...
                    </>
                  ) : (
                    "Check in"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
