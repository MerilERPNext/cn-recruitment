import { useState } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import { Card } from "../../../shared/atoms/Card";
import { employees, goals, checkIns } from "./mockData";
import { ChevronRight, ArrowLeft, ClipboardList } from "lucide-react";
import Badge from "../../../shared/Badge";

type ViewState = "employees" | "goals" | "checkIns";

const sentimentStyles: Record<string, { active: string; dot: string }> = {
  "On Track": {
    active: "border-green-500 bg-green-50 text-green-700",
    dot: "bg-green-500",
  },
  Completed: {
    active: "border-blue-500 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
  "At Risk": {
    active: "border-orange-500 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
  Behind: {
    active: "border-red-500 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

const getStatusVariant = (status?: string) => {
  if (!status) return "default";
  const s = status.toLowerCase();
  if (s === "completed" || s === "approved") return "success";
  if (s === "at risk" || s === "pending") return "warning";
  if (s === "behind" || s === "rejected") return "danger";
  return "info";
};

const CircularProgress = ({ score }: { score: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-gray-100"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-blue-500"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-900">{score}</span>
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          Score
        </span>
      </div>
    </div>
  );
};

const TeamTracking = () => {
  const [viewState, setViewState] = useState<ViewState>("employees");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const handleEmployeeClick = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setViewState("goals");
  };

  const handleGoalClick = (goalId: string) => {
    setSelectedGoalId(goalId);
    setViewState("checkIns");
  };

  const handleBack = () => {
    if (viewState === "checkIns") {
      setViewState("goals");
      setSelectedGoalId(null);
    } else if (viewState === "goals") {
      setViewState("employees");
      setSelectedEmployeeId(null);
    }
  };

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const selectedGoal = selectedEmployeeId
    ? goals[selectedEmployeeId as keyof typeof goals]?.find(
        (g) => g.id === selectedGoalId,
      )
    : null;
  const currentCheckIns = selectedGoalId
    ? checkIns[selectedGoalId as keyof typeof checkIns] || []
    : [];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
        {viewState !== "employees" && (
          <button
            onClick={handleBack}
            className="mr-3 p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <Typography variant="h4" className="font-semibold text-gray-900">
            {viewState === "employees" && "Team Tracking"}
            {viewState === "goals" && `Goals for ${selectedEmployee?.name}`}
            {viewState === "checkIns" && `Goal Details: ${selectedGoal?.title}`}
          </Typography>
          <Typography variant="bodySmall" className="text-gray-500 mt-0.5">
            {viewState === "employees" &&
              "Select an employee to view their goals."}
            {viewState === "goals" &&
              `${selectedEmployee?.designation} • ${selectedEmployee?.department}`}
            {viewState === "checkIns" &&
              `Tracking progress and updates for this goal.`}
          </Typography>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
        {viewState === "employees" && (
          <div className="space-y-3 max-w-3xl mx-auto">
            {employees.map((emp) => (
              <Card
                key={emp.id}
                className="p-4 border border-gray-100 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all flex justify-between items-center bg-white group"
                onClick={() => handleEmployeeClick(emp.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                    {emp.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <Typography
                      variant="body"
                      className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors"
                    >
                      {emp.name}
                    </Typography>
                    <Typography variant="bodySmall" className="text-gray-500">
                      {emp.designation} • {emp.department}
                    </Typography>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </Card>
            ))}
          </div>
        )}

        {viewState === "goals" && selectedEmployeeId && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {goals[selectedEmployeeId as keyof typeof goals]?.length ? (
              goals[selectedEmployeeId as keyof typeof goals].map((goal) => (
                <Card
                  key={goal.id}
                  className="p-5 border border-gray-100 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all bg-white group"
                  onClick={() => handleGoalClick(goal.id)}
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="min-w-0 space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          label={goal.goal_type || "OKR"}
                          variant="purple"
                          size="sm"
                        />
                        <Badge
                          label={goal.status || "-"}
                          variant={getStatusVariant(goal.status)}
                          size="sm"
                          pulse={{ show: true }}
                        />
                      </div>
                      <div>
                        <Typography
                          variant="body"
                          className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors mb-1 truncate"
                        >
                          {goal.title}
                        </Typography>
                        <Typography
                          variant="bodySmall"
                          className="text-gray-500 truncate"
                        >
                          {goal.description}
                        </Typography>
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
                          {new Date(goal.dueDate).toLocaleDateString()}
                        </Typography>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Typography variant="body" className="text-gray-500">
                  No goals found for this employee.
                </Typography>
              </div>
            )}
          </div>
        )}

        {viewState === "checkIns" && selectedGoal && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Goal Overview matching GoalDetails.tsx */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                <div className="min-w-0 space-y-4 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      label={selectedGoal.goal_type || "OKR"}
                      variant="purple"
                      size="sm"
                    />
                    {selectedEmployee?.department && (
                      <Badge
                        label={selectedEmployee.department}
                        variant="default"
                        size="sm"
                      />
                    )}
                    {selectedEmployee?.designation && (
                      <Badge
                        label={selectedEmployee.designation}
                        variant="info"
                        size="sm"
                      />
                    )}
                    <Badge
                      label={selectedGoal.status || "-"}
                      variant={getStatusVariant(selectedGoal.status)}
                      size="sm"
                      pulse={{ show: true }}
                    />
                  </div>
                  <div>
                    <Typography
                      variant="h3"
                      className="mb-2 text-xl leading-tight sm:text-2xl"
                    >
                      {selectedGoal.title || "-"}
                    </Typography>
                    <Typography variant="bodySmall" className="text-gray-500">
                      {selectedGoal.description || "-"}
                    </Typography>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 sm:grid-cols-4">
                    <div className="rounded-lg bg-gray-50 p-3 lg:bg-transparent lg:p-0">
                      <Typography
                        variant="caption"
                        className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold"
                      >
                        Owner
                      </Typography>
                      <Typography
                        variant="bodySmall"
                        className="font-semibold text-gray-900"
                      >
                        {selectedEmployee?.name || "-"}
                      </Typography>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 lg:bg-transparent lg:p-0">
                      <Typography
                        variant="caption"
                        className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold"
                      >
                        Start
                      </Typography>
                      <Typography
                        variant="bodySmall"
                        className="font-semibold text-gray-900"
                      >
                        {selectedGoal.start_date
                          ? new Date(
                              selectedGoal.start_date,
                            ).toLocaleDateString()
                          : "-"}
                      </Typography>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 lg:bg-transparent lg:p-0">
                      <Typography
                        variant="caption"
                        className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold"
                      >
                        End
                      </Typography>
                      <Typography
                        variant="bodySmall"
                        className="font-semibold text-gray-900"
                      >
                        {selectedGoal.dueDate
                          ? new Date(selectedGoal.dueDate).toLocaleDateString()
                          : "-"}
                      </Typography>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 lg:bg-transparent lg:p-0">
                      <Typography
                        variant="caption"
                        className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold"
                      >
                        Weightage
                      </Typography>
                      <Typography
                        variant="bodySmall"
                        className="font-semibold text-gray-900"
                      >
                        {selectedGoal.weightage !== undefined
                          ? `${selectedGoal.weightage}%`
                          : "-"}
                      </Typography>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-center justify-center bg-gray-50 rounded-xl p-4 sm:p-6 lg:w-[200px]">
                  <CircularProgress score={selectedGoal.score ?? 0} />
                  <Typography
                    variant="caption"
                    className="text-gray-500 mt-3 text-center"
                  >
                    {selectedGoal.progress
                      ? `${selectedGoal.progress}% Achieved`
                      : `${selectedGoal.score ?? 0} / 100`}
                  </Typography>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Left Column (Key Results) */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <Typography variant="h4">Key Results</Typography>
                  </div>
                  <div className="space-y-4 sm:space-y-6">
                    {selectedGoal.key_results &&
                    selectedGoal.key_results.length > 0 ? (
                      selectedGoal.key_results.map((kr, idx) => (
                        <div key={idx} className="relative">
                          <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start gap-3 sm:items-center">
                              <Badge
                                label={`KR ${idx + 1}`}
                                variant="purple"
                                size="sm"
                              />
                              <Typography
                                variant="bodyMedium"
                                className="font-medium leading-snug text-gray-900"
                              >
                                {kr.title || "-"}
                              </Typography>
                            </div>
                            <div className="text-left sm:text-right">
                              <Typography
                                variant="bodyMedium"
                                className="font-bold text-gray-900"
                              >
                                {kr.achievement ?? 0}% Achieved
                              </Typography>
                              <Typography
                                variant="caption"
                                className="text-gray-500"
                              >
                                Weightage: {kr.weightage ?? 0}%
                              </Typography>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-md h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-md ${kr.achievement >= 75 ? "bg-green-500" : kr.achievement >= 50 ? "bg-yellow-500" : "bg-blue-500"}`}
                              style={{
                                width: `${Math.min(kr.achievement ?? 0, 100)}%`,
                              }}
                            />
                          </div>
                          {idx !== selectedGoal.key_results.length - 1 && (
                            <hr className="mt-6 border-gray-100" />
                          )}
                        </div>
                      ))
                    ) : (
                      <Typography
                        variant="bodyMedium"
                        className="text-gray-500 text-center py-4"
                      >
                        No Key Results found.
                      </Typography>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column (Check-ins) */}
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <ClipboardList className="w-4 h-4 text-blue-500" />
                    <Typography variant="h4">Check-ins</Typography>
                  </div>
                  <Typography
                    variant="bodySmall"
                    className="text-gray-500 mb-6"
                  >
                    Progress check-in history
                  </Typography>

                  {currentCheckIns.length ? (
                    <div className="space-y-3">
                      {currentCheckIns.map((checkIn) => (
                        <div
                          key={checkIn.id}
                          className="rounded-lg border border-gray-100 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Typography
                                variant="bodySmall"
                                className="font-semibold text-gray-800"
                              >
                                {checkIn.progress}% progress
                              </Typography>
                              <Typography
                                variant="caption"
                                className="text-gray-400"
                              >
                                {new Date(checkIn.date).toLocaleDateString()}
                              </Typography>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-2 py-1 text-[11px] font-semibold ${sentimentStyles[checkIn.sentiment]?.active ?? "bg-gray-100 text-gray-600"}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${sentimentStyles[checkIn.sentiment]?.dot ?? "bg-gray-400"}`}
                              />
                              {checkIn.sentiment}
                            </span>
                          </div>
                          {checkIn.notes && (
                            <Typography
                              variant="caption"
                              className="mt-2 block whitespace-pre-wrap text-gray-600"
                            >
                              {checkIn.notes}
                            </Typography>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
                      <ClipboardList className="h-8 w-8 text-gray-300 mb-3" />
                      <Typography
                        variant="bodySmall"
                        className="text-gray-500 font-medium"
                      >
                        No check-ins yet
                      </Typography>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamTracking;
