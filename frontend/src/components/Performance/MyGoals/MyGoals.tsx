import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Info,
  Trash2,
  Plus,
  Search,
  Target,
  Timer,
  Weight,
  AlertCircle,
} from "lucide-react";
import { Typography } from "../../shared/atoms/Typography";
import Badge, { type BadgeVariant } from "../../shared/Badge";
import Button from "../../shared/atoms/Button";
import Modal from "../../shared/Modal";
import { useScreenSize } from "../../../hooks/useScreenSize";
import {
  useDeleteGoals,
  useMyGoals,
  useSubmitSelectedGoals,
} from "../../../hooks/usePerformance";
import type { MyGoalsGoal, MyGoalsKeyResult } from "../../../types/goal";
import { getPerformanceErrorMessage } from "../../../services/performanceService";
import CustomDropdown from "../../shared/CustomDropdown";
import MandatoryGoalsBanner from "../GoalCreation/component/MandatoryGoalsBanner";
import PerformanceSkeleton from "../PerformanceSkeleton";

const getStatusVariant = (status?: string): BadgeVariant => {
  const s = (status ?? "").toLowerCase();
  if (s === "on-track" || s === "completed") return "success";
  if (s === "at-risk" || s === "in progress") return "warning";
  if (s === "off-track" || s === "cancelled") return "danger";
  if (s === "not started") return "default";
  return "default";
};

const getSubmissionVariant = (state?: string): BadgeVariant => {
  const s = (state ?? "").toLowerCase();
  if (s === "approved") return "success";
  if (s === "pending") return "warning";
  if (s === "submitted") return "info";
  if (s === "rejected") return "danger";
  if (s === "draft") return "info";
  return "info";
};
const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const getBarColor = (status?: string): string => {
  const s = (status ?? "").toLowerCase();
  if (s === "on-track" || s === "completed") return "bg-green-500";
  if (s === "at-risk" || s === "in progress") return "bg-yellow-500";
  if (s === "off-track" || s === "cancelled") return "bg-red-500";
  return "bg-blue-500";
};

const getGoalId = (goal: MyGoalsGoal): string => goal.goal_key || goal.name || "";

const getGoalSubmissionStatus = (goal: MyGoalsGoal): string =>
  goal.goal_status || goal.submission_status || "";

const isSelectableGoal = (goal: MyGoalsGoal): boolean =>
  ["draft", "pending"].includes(getGoalSubmissionStatus(goal).toLowerCase());

interface MyGoalsProps {
  onCreateGoal?: () => void;
  onSelectGoal?: (index: number) => void;
}

const MyGoals: React.FC<MyGoalsProps> = ({ onCreateGoal, onSelectGoal }) => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;
  const [openGoalIndex, setOpenGoalIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [editedWeightages, setEditedWeightages] = useState<Record<string, number>>({});
  const [goalsToDelete, setGoalsToDelete] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: myGoalsResponse, isLoading, isError, error } = useMyGoals();
  const { mutateAsync: submitSelectedGoals, isPending: isSubmitting } = useSubmitSelectedGoals();
  const { mutateAsync: deleteGoals, isPending: isDeleting } = useDeleteGoals();

  const goalsData = myGoalsResponse?.data;
  const allGoals: MyGoalsGoal[] = goalsData?.goals ?? [];
  const totalGoals = goalsData?.total ?? 0;
  const activeCycle = goalsData?.active_cycle ?? "";
  const totalWeightage = allGoals.reduce((sum, g) => {
    const goalId = getGoalId(g);
    const w = editedWeightages[goalId] !== undefined ? editedWeightages[goalId] : g.weightage;
    return sum + (Number(w) || 0);
  }, 0);

  const goals = useMemo(() => {
    return allGoals.filter(g=>{
      const goalStatus = (getGoalSubmissionStatus(g) || "").toLocaleLowerCase()
      const matchStatus = statusFilter === "all" || goalStatus === statusFilter.toLocaleLowerCase()
      const q = searchQuery.trim().toLocaleLowerCase()
      const matchSearch = !q || (g.title || "").toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q) ||
        (g.department_title || "").toLowerCase().includes(q) ||
        (g.goal_type || "").toLowerCase().includes(q)

        return matchStatus && matchSearch
      }).reverse()
  }, [allGoals, searchQuery, statusFilter]);

  const handleDeleteDraftGoal = (e: React.MouseEvent, goal: MyGoalsGoal) => {
    e.stopPropagation();
    setGoalsToDelete([getGoalId(goal)]);
  };

  const handleToggleSelection = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    );
  };

  const draftGoals = goals.filter(isSelectableGoal);

  const selectedGoalsData = allGoals.filter((g) => selectedGoals.includes(getGoalId(g)));
  const selectedWeightageSum = selectedGoalsData.reduce((sum, g) => {
    const goalId = getGoalId(g);
    const w = editedWeightages[goalId] !== undefined ? editedWeightages[goalId] : g.weightage;
    return sum + (Number(w) || 0);
  }, 0);
  const isTotalWeightageValid = Math.abs(selectedWeightageSum - 100) < 0.0001;
  const hasPositiveWeightageForEachGoal = selectedGoalsData.every((goal) => {
    const weightage =
      editedWeightages[getGoalId(goal)] !== undefined
        ? editedWeightages[getGoalId(goal)]
        : goal.weightage;
    return Number(weightage) > 0;
  });
  const canSubmitSelectedGoals =
    selectedGoalsData.length > 0 &&
    isTotalWeightageValid &&
    hasPositiveWeightageForEachGoal;

  const weightageColor = isTotalWeightageValid
      ? 'text-emerald-500 font-bold' 
      : selectedWeightageSum > 100
          ? 'text-red-500 font-bold' 
          : 'text-text-body2 font-medium';

  const handleSubmitSelectedGoals = async () => {
    if (!canSubmitSelectedGoals) {
      toast.error(
        hasPositiveWeightageForEachGoal
          ? "Total weightage must be exactly 100% before submitting."
          : "Each selected goal must have a weightage greater than 0%.",
      );
      return;
    }

    try {
      const response = await submitSelectedGoals({
        goals: selectedGoalsData.map((goal) => ({
          goal: getGoalId(goal),
          weightage:
            editedWeightages[getGoalId(goal)] !== undefined
              ? editedWeightages[getGoalId(goal)]
              : goal.weightage,
        })),
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to submit selected goals.");
      }

      toast.success(response.message || "Selected goals submitted successfully.");
      setSelectedGoals([]);
    } catch (submitError) {
      toast.error(getPerformanceErrorMessage(submitError, "Failed to submit selected goals. Please try again."));
    }
  };

  const handleConfirmDeleteGoals = async () => {
    if (goalsToDelete.length === 0) return;

    try {
      const response = await deleteGoals({ goals: goalsToDelete });

      if (!response.success) {
        throw new Error(response.message || "Failed to delete goal(s).");
      }

      toast.success(response.message || "Goal(s) deleted successfully.");
      setSelectedGoals((current) =>
        current.filter((goalName) => !goalsToDelete.includes(goalName)),
      );
      setGoalsToDelete([]);
    } catch (deleteError) {
      toast.error(getPerformanceErrorMessage(deleteError, "Failed to delete goal(s). Please try again."));
    }
  };

  const handleToggleAll = () => {
    if (selectedGoals.length === draftGoals.length && draftGoals.length > 0) {
      setSelectedGoals([]);
    } else {
      setSelectedGoals(draftGoals.map(getGoalId));
    }
  };

 

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-app">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-6">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <Typography variant="bodySmall" className="text-red-500">
            {error?.message || "Failed to load goals. Please try again."}
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-full overflow-y-auto overflow-x-hidden bg-app px-3 py-4 font-sans sm:px-4 sm:py-5 lg:px-1 lg:pt-1 ${
        selectedGoals.length > 0 ? "pb-52 sm:pb-44 lg:pb-48" : "pb-16 sm:pb-20 lg:pb-24"
      }`}
    >
      <MandatoryGoalsBanner />

      <div className="mx-auto w-full  min-w-0 space-y-4 sm:space-y-5">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex min-w-0 flex-col gap-4 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Typography
                variant="h3"
                className="text-xl leading-tight sm:text-2xl font-bold"
              >
                My Goals &middot; {activeCycle ?? "-"}
              </Typography>
              <Typography
                variant="bodySmall"
                color="body2"
                className="mt-1 block break-words"
              >
                {totalGoals ?? "-"} goal{totalGoals !== 1 ? "s" : ""} &middot; {totalWeightage ?? "-"}% weightage
              </Typography>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-2 min-[520px]:grid-cols-3 lg:w-[650px] lg:max-w-[650px]">
              {[
                { icon: Target, label: "Goals", value: String(totalGoals) },
                { icon: Weight, label: "Weightage", value: `${totalWeightage}%` },
                { icon: Timer, label: "Cycle", value: activeCycle },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="min-w-0 rounded-lg border border-border bg-slate-500/10 px-3 py-2"
                >
                  <div className="flex items-center gap-1.5 text-text-body2">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <Typography
                      variant="caption"
                      color="body2"
                      className="truncate"
                    >
                      {label}
                    </Typography>
                  </div>
                  <Typography
                    variant="bodySmall"
                    className="mt-1 block truncate font-semibold"
                  >
                    {value}
                  </Typography>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
            <div className="relative flex h-10 w-full min-w-0 items-center ">
              <Search className="absolute left-3 h-4 w-4 text-text-body2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search goals…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-text-title placeholder:text-text-body2 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid w-full shrink-0 grid-cols-2 gap-1 sm:flex sm:items-center md:w-auto">
              <CustomDropdown
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={statusOptions}
                label="Filter Status"
                contentAlign="start"
                className="w-30"
                menuClassName="!w-40 !min-w-0"
              />
              <Button
                onClick={() => {
                  if (onCreateGoal) {
                    onCreateGoal();
                  } else {
                    navigate("/webapp/performance-app/my-goals/new-goal");
                  }
                }}
                variant="contain"
                bgColor="primary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                className="h-10 w-full  justify-center sm:w-auto"
              >
                New Goal
              </Button>
            </div>
          </div>
        </div>

        {/* Goals list */}
        <div className="relative min-w-0 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4 lg:p-5">
          {isLoading ? (
            <PerformanceSkeleton count={4} />
          ) : (
            <>
              {!isCompact && (
                <div className="absolute bottom-8 left-[38px] top-5 w-px bg-border" />
              )}

              <div className="relative min-w-0 space-y-3 sm:space-y-4 md:pl-9 lg:pl-12">
                {draftGoals.length > 0 && (
                  <div className="flex items-center px-4 lg:px-5">
                    <div className="flex shrink-0 items-center mr-2">
                      <input
                        type="checkbox"
                        id="selectAllDrafts"
                        checked={
                          selectedGoals.length === draftGoals.length &&
                          draftGoals.length > 0
                        }
                        onChange={handleToggleAll}
                        className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-primary"
                      />
                    </div>
                    <label
                      htmlFor="selectAllDrafts"
                      className="text-sm font-medium text-text-title cursor-pointer select-none"
                    >
                      Select All ({selectedGoals.length}/{draftGoals.length})
                    </label>
                  </div>
                )}

                {goals.length === 0 ? (
                  <div className="flex items-center gap-2 justify-center py-8 px-4 text-center rounded-lg border border-dashed border-border bg-card shadow-sm">
                    <Info className="h-5 w-5 text-primary shrink-0" />
                    <Typography
                      variant="bodySmall"
                      color="body2"
                      className="font-medium"
                    >
                      No goals found. Create a new goal to get started.
                    </Typography>
                  </div>
                ) : (
                  goals.map((goal: MyGoalsGoal, index: number) => (
                <div
                  key={getGoalId(goal)}
                  onClick={() => {
                    if (onSelectGoal) {
                      onSelectGoal(index);
                    } else {
                      navigate(`/webapp/performance-app/my-goals/${getGoalId(goal)}`);
                    }
                  }}
                  className="relative z-5 min-w-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
                >
                  {!isCompact && (
                    <div className="absolute left-[-28px] top-12 h-px w-[28px] bg-border" />
                  )}

                  <div className="relative z-10 flex min-w-0 flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
                    {/* Left: Checkbox + goal_type badge + department + title */}
                    <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start">
                      {isSelectableGoal(goal) && (
                        <div
                          className="flex shrink-0 items-center mt-1 mr-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedGoals.includes(getGoalId(goal))}
                            onChange={() => handleToggleSelection(getGoalId(goal))}
                            className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-primary"
                            aria-label={`Select ${goal.title}`}
                          />
                        </div>
                      )}
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:w-[104px] sm:flex-col sm:items-start sm:gap-1">
                        <Badge label={goal.goal_type} variant="purple" size="sm" />
                        <Typography
                          variant="caption"
                          color="body2"
                          className="sm:ml-1"
                        >
                          {goal.department_title}
                        </Typography>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Typography
                          variant="bodyMedium"
                          className="mb-1 block break-words font-semibold leading-snug"
                        >
                          {goal.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="body2"
                          className="block break-words leading-relaxed"
                        >
                          {goal.description}
                        </Typography>
                      </div>
                    </div>

                    {/* Right: weightage bar + status + approval + chevron */}
                    <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 rounded-lg bg-slate-500/10 p-3 md:flex-row md:items-center md:justify-between lg:max-w-[400px] lg:bg-transparent lg:p-0">
                      <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 lg:border-r lg:border-border lg:pr-5">
                        <div className="min-w-0">
                          {selectedGoals.includes(getGoalId(goal)) ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                className="w-14 rounded border border-border bg-card px-2 py-1 text-sm font-semibold text-text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                value={editedWeightages[getGoalId(goal)] !== undefined ? editedWeightages[getGoalId(goal)] : goal.weightage}
                                onChange={(e) => {
                                  const rawVal = e.target.value;
                                  if (rawVal === "") {
                                    setEditedWeightages((prev) => ({ ...prev, [getGoalId(goal)]: 0 }));
                                    return;
                                  }
                                  if (/^\d*\.?\d*$/.test(rawVal)) {
                                    const num = parseFloat(rawVal);
                                    if (!isNaN(num)) {
                                      setEditedWeightages((prev) => ({
                                        ...prev,
                                        [getGoalId(goal)]: Math.min(num, 100)
                                      }));
                                    }
                                  }
                                }}
                              />
                              <span className="text-sm font-bold text-text-title">%</span>
                            </div>
                          ) : (
                            <Typography
                              variant="bodyMedium"
                              className="block whitespace-nowrap font-bold"
                            >
                              {editedWeightages[getGoalId(goal)] !== undefined ? editedWeightages[getGoalId(goal)] : goal.weightage}%
                            </Typography>
                          )}
                          <Typography
                            variant="caption"
                            color="body2"
                            className="mt-0.5 block break-words"
                          >
                            Weightage
                          </Typography>
                        </div>
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <Typography
                            variant="caption"
                            color="body2"
                            className="text-right"
                          >
                            {editedWeightages[getGoalId(goal)] !== undefined ? editedWeightages[getGoalId(goal)] : goal.weightage}%
                          </Typography>
                          <div className="h-2 w-full overflow-hidden rounded-md bg-slate-500/20">
                            <div
                              className={`h-2 rounded-md ${getBarColor(goal.status)} transition-all duration-300`}
                              style={{ width: `${editedWeightages[getGoalId(goal)] !== undefined ? editedWeightages[getGoalId(goal)] : goal.weightage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-col md:items-end">
                        <Badge
                          label={goal.status}
                          variant={getStatusVariant(goal.status)}
                          size="sm"
                          pulse={{ show: true }}
                        />
                        <Badge
                          label={getGoalSubmissionStatus(goal)}
                          variant={getSubmissionVariant(getGoalSubmissionStatus(goal))}
                          size="sm"
                        />
                      </div>
                      <div className="flex shrink-0 justify-between items-center gap-2">
                        {isSelectableGoal(goal) && (
                          <button
                            onClick={(e) => handleDeleteDraftGoal(e, goal)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text-body2 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500"
                            title="Delete draft goal"
                            aria-label="Delete draft goal"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <ChevronRight
                          className={`h-5 w-5 border-border border rounded-full text-text-body2 transition-transform duration-200 cursor-pointer ${openGoalIndex === index ? "rotate-90" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenGoalIndex(
                              openGoalIndex === index ? null : index,
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Key Results */}
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${openGoalIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  >
                    <div className="overflow-hidden">
                      <div className="relative z-10 border-t border-border bg-slate-500/10 p-3 sm:p-4">
                        {goal.key_results && goal.key_results.length > 0 ? (
                          <div className="relative min-w-0 space-y-3 md:pl-8">
                            {!isCompact && (
                              <div className="absolute bottom-4 left-[16px] top-[-16px] w-px bg-border" />
                            )}
                            {goal.key_results.map((kr: MyGoalsKeyResult, kIdx: number) => (
                              <div
                                key={kr.goal_key || kr.name}
                                className="relative flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center"
                              >
                                {!isCompact && (
                                  <div className="absolute left-[-16px] top-[18px] h-px w-[16px] bg-border" />
                                )}

                                <div className="flex min-w-0 flex-1 items-start gap-3 lg:items-center">
                                  <div className="mt-0.5 flex-shrink-0">
                                    <Badge
                                      label={`KR ${kIdx + 1}`}
                                      variant="purple-outline"
                                      size="sm"
                                    />
                                  </div>
                                  <Typography
                                    variant="caption"
                                    color="body2"
                                    className="min-w-0 break-words leading-relaxed"
                                  >
                                    {kr.title}
                                  </Typography>
                                </div>

                                <div className="flex w-full min-w-0 shrink-0 items-center justify-start lg:w-[240px] xl:w-[320px]">
                                  <div className="flex w-full min-w-0 flex-col gap-1">
                                    <Typography
                                      variant="caption"
                                      color="body2"
                                      className="text-right"
                                    >
                                      {kr.weightage}%
                                    </Typography>
                                    <div className="h-1.5 w-full overflow-hidden rounded-md bg-slate-500/20">
                                      <div
                                        className="h-1.5 rounded-md bg-primary"
                                        style={{ width: `${kr.weightage}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 justify-center py-4 px-4 text-center rounded-lg border border-dashed border-border bg-card shadow-sm">
                            <Info className="h-4 w-4 text-primary shrink-0" />
                            <Typography
                              variant="caption"
                              color="body2"
                              className="font-medium"
                            >
                              No Key Results (KRs) linked to this goal.
                            </Typography>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>

        {/* Floating Bottom Bar for Selected Goals */}
        {selectedGoals.length > 0 && (
          <div className="fixed bottom-3 left-3 right-3 z-50 flex max-h-[calc(100vh-1.5rem)] flex-col items-center justify-between gap-4 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-[0_8px_30px_rgb(0,0,0,0.3)] sm:bottom-4 sm:left-4 sm:right-4 sm:flex-row sm:px-6 lg:left-24">
            <div className="flex items-center gap-3">
              <Typography variant="bodyMedium" className="font-semibold">
                {selectedGoals.length} goal{selectedGoals.length > 1 ? "s" : ""} selected
              </Typography>
              <div className="h-4 w-px bg-border" />
              <Typography variant="bodyMedium" className={weightageColor}>
                Total Weightage: {selectedWeightageSum}%
              </Typography>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                bgColor="text"
                size="sm"
                onClick={() => setSelectedGoals([])}
              >
                Cancel
              </Button>
              <Button
                variant="soft"
                bgColor="error"
                size="sm"
                onClick={() => setGoalsToDelete(selectedGoals)}
                disabled={isSubmitting}
              >
                Delete Selected
              </Button>
              <Button
                variant="contain"
                bgColor="primary"
                size="sm"
                onClick={handleSubmitSelectedGoals}
                loading={isSubmitting}
                disabled={isDeleting || !canSubmitSelectedGoals}
              >
                Submit Selected
              </Button>
            </div>
          </div>
        )}

        <Modal
          isOpen={goalsToDelete.length > 0}
          onClose={() => !isDeleting && setGoalsToDelete([])}
          size="sm"
          className="max-w-md p-6 sm:rounded-2xl bg-card text-text-title border border-border"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <Typography variant="h4" className="font-semibold">
              Delete {goalsToDelete.length > 1 ? "Goals" : "Goal"}?
            </Typography>
            <Typography variant="bodyMedium" color="body2" className="mt-2 text-sm leading-relaxed">
              Are you sure you want to delete {goalsToDelete.length > 1 ? "these selected goals" : "this goal"}? This action cannot be undone.
            </Typography>
            <div className="mt-6 flex w-full items-center justify-end gap-3">
              <Button
                variant="outline"
                bgColor="text"
                className="h-10 flex-1 justify-center"
                onClick={() => setGoalsToDelete([])}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="contain"
                bgColor="error"
                className="h-10 flex-1 justify-center"
                onClick={handleConfirmDeleteGoals}
                loading={isDeleting}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default MyGoals;
