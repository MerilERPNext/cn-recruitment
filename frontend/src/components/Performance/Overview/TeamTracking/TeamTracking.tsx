import { useState } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import { Card } from "../../../shared/atoms/Card";
import { ChevronRight, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import Badge from "../../../shared/Badge";
import Button from "../../../shared/atoms/Button";
import { useLinkFieldOptions } from "../../../../hooks/useLinkFieldOptions";
import { useMyGoals } from "../../../../hooks/usePerformance";
import type { MyGoalsGoal } from "../../../../types/goal";

type ViewState = "employees" | "goals";

const getStatusVariant = (status?: string) => {
  if (!status) return "default";
  const s = status.toLowerCase();
  if (s === "completed" || s === "on track" || s === "approved") return "success";
  if (s === "at risk" || s === "pending" || s === "draft") return "warning";
  if (s === "off-track" || s === "rejected") return "danger";
  return "info";
};

const ErrorState = ({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) => (
  <div className="flex min-h-[300px] items-center justify-center p-6">
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center max-w-md">
      <AlertCircle className="h-8 w-8 text-red-500" />
      <Typography variant="bodySmall" className="text-red-700 font-medium">
        {message || "Failed to load data. Please try again."}
      </Typography>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-2 text-xs flex items-center gap-1.5 border-red-300 text-red-700 hover:bg-red-100"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </Button>
      )}
    </div>
  </div>
);

// Skeleton Loader Component for Employee Cards List
const EmployeeListSkeleton = () => (
  <div className="space-y-3 max-w-3xl mx-auto">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="p-4 border border-gray-100 rounded-xl bg-white flex justify-between items-center animate-pulse"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
          <div className="h-4 w-44 bg-slate-200 rounded-md" />
        </div>
        <div className="w-5 h-5 bg-slate-200 rounded shrink-0" />
      </div>
    ))}
  </div>
);

// Skeleton Loader Component for Goals Cards List
const EmployeeGoalsSkeleton = () => (
  <div className="space-y-4 max-w-4xl mx-auto">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="p-5 border border-gray-100 rounded-xl bg-white animate-pulse"
      >
        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-slate-200 rounded-md" />
              <div className="h-5 w-20 bg-slate-200 rounded-md" />
            </div>
            <div className="h-5 w-3/4 bg-slate-200 rounded-md" />
            <div className="h-4 w-1/2 bg-slate-200 rounded-md" />
          </div>
          <div className="flex items-center gap-6">
            <div className="h-8 w-16 bg-slate-200 rounded-md" />
            <div className="w-5 h-5 bg-slate-200 rounded shrink-0" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const EmployeeGoalsList = ({
  goalsList,
  isLoading,
  isError,
  error,
  onRetry,
  onSelectGoal,
}: {
  goalsList: MyGoalsGoal[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onSelectGoal?: (id: string) => void;
}) => {
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


        return (
          <Card
            key={goalId}
            className="p-5 border border-gray-100 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all bg-white group"
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
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 font-medium text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGoal?.(goalId);
                  }}
                >
                  Check in
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// Main Component
const TeamTracking = () => {
  const [viewState, setViewState] = useState<ViewState>("employees");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );

  const {
    data: employeeData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isEmployeesLoading,
    isError: isEmployeesError,
    error: employeesError,
    refetch: refetchEmployees,
  } = useLinkFieldOptions({
    doctype: "Employee",
    filters: { status: "Active" },
  });

  const {
    data: myGoalsResponse,
    isLoading: isGoalsLoading,
    isError: isGoalsError,
    error: goalsError,
    refetch: refetchGoals,
  } = useMyGoals();

  const employeeList =
    employeeData?.pages?.flatMap((page) => page?.results || []) || [];

  const selectedEmployee = employeeList.find(
    (e: { id: string; label?: string }) => e.id === selectedEmployeeId,
  );

  const realGoals: MyGoalsGoal[] = myGoalsResponse?.data?.goals ?? [];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
        {viewState !== "employees" && (
          <button
            onClick={() => {
              setViewState("employees");
              setSelectedEmployeeId(null);
            }}
            className="mr-3 p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <Typography variant="h4" className="font-semibold text-gray-900">
            {viewState === "employees"
              ? "Team Tracking"
              : `Goals for ${selectedEmployee?.label || "Employee"}`}
          </Typography>
          <Typography variant="bodySmall" className="text-gray-500 mt-0.5">
            {viewState === "employees"
              ? "Select an employee to view their goals."
              : "Software Engineer • Engineering"}
          </Typography>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
        {viewState === "employees" ? (
          isEmployeesLoading ? (
            <EmployeeListSkeleton />
          ) : isEmployeesError ? (
            <ErrorState
              message={employeesError?.message}
              onRetry={refetchEmployees}
            />
          ) : (
            <div className="space-y-3 max-w-3xl mx-auto">
              {employeeList.map((emp: { id: string; label: string }) => (
                <Card
                  key={emp.id}
                  className="p-4 border border-gray-100 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all flex justify-between items-center bg-white group"
                  onClick={() => {
                    setSelectedEmployeeId(emp.id);
                    setViewState("goals");
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                      {(emp.label || "")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <Typography
                      variant="body"
                      className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors"
                    >
                      {emp.label}
                    </Typography>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </Card>
              ))}

              {hasNextPage && (
                <div className="flex justify-center pt-4 pb-2">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    variant="outline"
                    className="text-sm font-medium border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 flex items-center gap-2 px-6 py-2 rounded-lg"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        Loading more employees...
                      </>
                    ) : (
                      "Load More Employees"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )
        ) : (
          <EmployeeGoalsList
            goalsList={realGoals}
            isLoading={isGoalsLoading}
            isError={isGoalsError}
            error={goalsError}
            onRetry={refetchGoals}
          />
        )}
      </div>
    </div>
  );
};

export default TeamTracking;
