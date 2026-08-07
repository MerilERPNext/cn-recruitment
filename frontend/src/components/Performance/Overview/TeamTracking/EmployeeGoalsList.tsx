import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Typography } from "../../../shared/atoms/Typography";
import { Card } from "../../../shared/atoms/Card";
import Badge, { type BadgeVariant } from "../../../shared/Badge";
import Button from "../../../shared/atoms/Button";
import { useEmployeeGoalsCheckIn, useMyGoals } from "../../../../hooks/usePerformance";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import type { MyGoalsGoal } from "../../../../types/goal";
import { ErrorState, EmployeeGoalsSkeleton } from "./TeamTrackingStates";
import { getPerformanceErrorMessage } from "../../../../services/performanceService";

const getStatusVariant = (status?: string): BadgeVariant => {
  if (!status) return "default";
  const s = status.toLowerCase();
  if (s === "approved" || s === "completed" || s === "on track") return "success";
  if (s === "pending" || s === "at risk" || s === "draft" || s === "in progress") return "warning";
  if (s === "rejected" || s === "off-track" || s === "cancelled") return "danger";
  return "info";
};

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
    () => (hasEmpGoals ? myGoalsResponse!.data.goals : sessionUserGoals?.data?.goals ?? []),
    [hasEmpGoals, myGoalsResponse, sessionUserGoals]
  );

  const { mutate: employeCheckIn, isPending } = useEmployeeGoalsCheckIn();
  const [loadingGoalKey, setLoadingGoalKey] = useState<string | null>(null);

  const submitCheckIns = (goalKey: string) => {
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
  };

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
      {goalsList.map((goal) => {
        const goalIdentifier = goal?.goal_key || goal?.goal || goal?.name || "";
        const isGoalPending = isPending && loadingGoalKey === goalIdentifier;
        const currentStatus = goal?.goal_status || goal?.status;
        const statusLower = (currentStatus || "").toLowerCase();
        const isPendingStatus = statusLower === "pending" || statusLower === "draft";

        return (
          <Card
            key={goalIdentifier}
            className="p-3.5 sm:p-5 border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all bg-white group"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-6">
              <div className="min-w-0 space-y-2 flex-1 w-full">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <Badge
                    label={goal?.goal_type || "-"}
                    variant="purple"
                    size="sm"
                  />
                  <Badge
                    label={currentStatus ?? "-"}
                    variant={getStatusVariant(currentStatus)}
                    size="sm"
                  />
                  {goal?.weightage !== undefined && (
                    <Badge
                      label={`${goal.weightage}%`}
                      variant="info"
                      size="sm"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <Typography
                    variant="body"
                    className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors mb-1 text-sm sm:text-base break-words leading-snug"
                  >
                    {goal?.title}
                  </Typography>
                  {goal.description && (
                    <Typography
                      variant="bodySmall"
                      className="text-gray-500 text-xs sm:text-sm break-words leading-relaxed mt-0.5"
                    >
                      {goal.description}
                    </Typography>
                  )}
                  <span className="text-xs text-gray-500 font-medium inline-block mt-1">
                    Last check in - {goal?.last_checkin_date ?? "No date found!"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end sm:justify-center shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
                <Button
                  variant="outline"
                  disabled={isGoalPending}
                  className={`font-medium text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1.5 ${isPendingStatus
                      ? "border-gray-200 text-gray-400 bg-gray-50 opacity-60 cursor-not-allowed"
                      : "border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-60 disabled:cursor-not-allowed"
                    }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPendingStatus) {
                      toast.error("Check-ins can be requested only on approved goals.");
                      return;
                    }
                    submitCheckIns(goalIdentifier);
                  }}
                >
                  {isGoalPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      Requesting Check in...
                    </>
                  ) : (
                    "Request Check in"
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
