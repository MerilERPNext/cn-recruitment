import { useCallback, useMemo, useState } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import { ArrowLeft } from "lucide-react";
import Button from "../../../shared/atoms/Button";
import { useLinkFieldOptions } from "../../../../hooks/useLinkFieldOptions";
import { useMyGoals } from "../../../../hooks/usePerformance";
import type { MyGoalsGoal } from "../../../../types/goal";
import { ErrorState, EmployeeListSkeleton } from "./TeamTrackingStates";
import { EmployeeGoalsList } from "./EmployeeGoalsList";
import { EmployeeCard } from "./EmployeeCard";

type ViewState = "employees" | "goals";

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
  const employeeList = useMemo(
    () => employeeData?.pages?.flatMap((page) => page?.results || []) || [],
    [employeeData]
  );
  const selectedEmployee = useMemo(
    () => employeeList.find((e) => e.id === selectedEmployeeId),
    [employeeList, selectedEmployeeId]
  );
  const handleSelectEmployee = useCallback((id: string) => {
    setSelectedEmployeeId(id);
    setViewState("goals");
  }, []);
  const realGoals: MyGoalsGoal[] = useMemo(
    () => myGoalsResponse?.data?.goals ?? [],
    [myGoalsResponse]
  );
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
                <EmployeeCard
                  key={emp.id}
                  emp={emp}
                  onSelect={handleSelectEmployee}
                />
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
            employeeId={selectedEmployeeId || ""}
          />
        ) }
      </div>
    </div>
  );
};

export default TeamTracking;
