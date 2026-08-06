import { useState } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import { Card } from "../../../shared/atoms/Card";
import { ChevronRight, ArrowLeft } from "lucide-react";
import Badge from "../../../shared/Badge";
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

const EmployeeGoalsList = ({
  goalsList,
  isLoading,
  onSelectGoal,
}: {
  goalsList: MyGoalsGoal[];
  isLoading?: boolean;
  onSelectGoal?: (id: string) => void;
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Typography variant="body" className="text-gray-500">
          Loading goals...
        </Typography>
      </div>
    );
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
        const dueDate = goal.end_date
          ? new Date(goal.end_date).toLocaleDateString()
          : "-";
     

        return (
          <Card
            key={goalId}
            className="p-5 border border-gray-100 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all bg-white group"
            onClick={() => onSelectGoal?.(goalId)}
          >
            <div className="flex flex-col lg:flex-row justify-between gap-6">
              <div className="min-w-0 space-y-3 flex-1">
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
                </div>
              </div>
              <div className="shrink-0 flex items-center justify-center gap-6">
                <div className="text-right">
                  <Typography
                    variant="caption"
                    className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold"
                  >
                    Due
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="font-semibold text-gray-900"
                  >
                    {dueDate}
                  </Typography>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
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

  const { data: employeeData } = useLinkFieldOptions({
    doctype: "Employee",
    filters: { status: "Active" },
  });

  const { data: myGoalsResponse, isLoading: isGoalsLoading } = useMyGoals();

  const employeeList = employeeData?.pages?.[0]?.results || [];
  const selectedEmployee = employeeList.find(
    (e: { id: string; label?: string }) => e.id === selectedEmployeeId,
  );

  // Fetch real goals data from useMyGoals API response (same as MyGoals.tsx)
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
          </div>
        ) : (
          <EmployeeGoalsList
            goalsList={realGoals}
            isLoading={isGoalsLoading}
          />
        )}
      </div>
    </div>
  );
};

export default TeamTracking;
