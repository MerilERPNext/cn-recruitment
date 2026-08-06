import { useState } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import { Card } from "../../../shared/atoms/Card";
import { ChevronRight, ArrowLeft } from "lucide-react";
import Button from "../../../shared/atoms/Button";
import { useLinkFieldOptions } from "../../../../hooks/useLinkFieldOptions";
import { useMyGoals } from "../../../../hooks/usePerformance";
import type { MyGoalsGoal } from "../../../../types/goal";
import { ErrorState, EmployeeListSkeleton } from "./TeamTrackingStates";
import { EmployeeGoalsList } from "./EmployeeGoalsList";

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
            employeeId={selectedEmployeeId || ""}
          />
        ) }

       
      </div>
    </div>
  );
};

export default TeamTracking;
