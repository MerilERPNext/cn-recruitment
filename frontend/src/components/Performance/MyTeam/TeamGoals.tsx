import {
  AlertCircle,
  ChevronRight,
  CornerDownRight,
  Plus,
  Target,
  Users,
  Weight,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import Badge, { type BadgeVariant } from "../../shared/Badge";
import Modal from "../../shared/Modal";

import Avatar from "../../shared/Avatar";
import { APPROVAL_GOALS, GOAL_DETAIL, TEAM_MEMBERS } from "./mockData";
import { GoalDetailData, GoalStatus } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusVariant: Record<GoalStatus, BadgeVariant> = {
  "On-track": "success",
  "At-risk": "warning",
  "Off-track": "danger",
};

const statusBarColor: Record<GoalStatus, string> = {
  "On-track": "bg-blue-500",
  "At-risk": "bg-blue-500",
  "Off-track": "bg-red-500",
};

const statusSummary = [
  { label: "18 On-track", variant: "success" as BadgeVariant },
  { label: "10 At-risk", variant: "warning" as BadgeVariant },
  { label: "4 Off-track", variant: "danger" as BadgeVariant },
];

const getInitialsBg = (initials: string) => {
  const map: Record<string, string> = {
    PM: "bg-purple-100 text-purple-700",
    KI: "bg-blue-100 text-blue-700",
    AB: "bg-green-100 text-green-700",
    MS: "bg-orange-100 text-orange-700",
  };
  return map[initials] || "bg-gray-200 text-gray-700";
};

// ─── Goal Detail Modal ────────────────────────────────────────────────────────

interface GoalDetailModalProps {
  goal: GoalDetailData;
  onClose: () => void;
  onApprove: () => void;
}

const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  goal,
  onClose,
  onApprove,
}) => {
  const [comment, setComment] = useState(goal.managerComment);
  const { isMobile } = useScreenSize();

  return (
    <Modal isOpen onClose={onClose} size="md">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-2 items-center mt-1">
            <Badge
              label={`${goal.type} · ${goal.label}`}
              backgroundColor="bg-purple-50 text-purple-700"
              size="sm"
            />
            <Badge
              label={goal.status}
              backgroundColor="bg-yellow-50 text-yellow-700"
              size="sm"
            />
            <Badge
              label={goal.approvalStatus}
              backgroundColor="bg-orange-50 text-orange-600"
              size="sm"
            />
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-2 p-1 border border-gray-200 rounded-lg"
            aria-label="Close goal detail"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Title + Employee */}
          <div>
            <Typography variant="h3" className="text-gray-900 mb-2">
              {goal.title}
            </Typography>
            <div className="flex items-center gap-2">
              <Avatar
                name={goal.employeeName}
                fontSize="text-xs"
                size="h-8 w-8"
                avatarBgColor={
                  getInitialsBg(goal.employeeInitials).split(" ")[0]
                }
                avatarTextColor={
                  getInitialsBg(goal.employeeInitials).split(" ")[1]
                }
              />
              <Typography variant="bodySmall" className="text-gray-500">
                {goal.employeeName} · {goal.designation} · submitted{" "}
                {goal.submittedAgo}
              </Typography>
            </div>
          </div>

          {/* Meta Grid */}
          <div
            className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-6`}
          >
            {[
              { label: "WEIGHTAGE", value: `${goal.weightage}%` },
              { label: "START", value: goal.start },
              { label: "END", value: goal.end },
              { label: "METRIC", value: goal.metric },
              { label: "ALIGNED TO", value: goal.alignedTo },
              { label: "CONTRIBUTION", value: goal.contribution },
              { label: "VISIBILITY", value: goal.visibility },
              { label: "AUTO-PULL", value: goal.autoPull },
            ].map((item) => (
              <div key={item.label}>
                <Typography
                  variant="caption"
                  className="text-gray-400 uppercase tracking-wider block mb-1 font-semibold"
                >
                  {item.label}
                </Typography>
                <Typography
                  variant="bodySmall"
                  className="font-semibold text-gray-800"
                >
                  {item.value}
                </Typography>
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <Typography
              variant="bodySmall"
              className="font-medium text-gray-900 mb-2 block"
            >
              Description
            </Typography>
            <div className="bg-[#f8fafc] border border-gray-100 rounded-xl p-4">
              <Typography variant="bodySmall" className="text-gray-600">
                {goal.description}
              </Typography>
            </div>
          </div>

          {/* Key Results */}
          <div>
            <Typography
              variant="bodySmall"
              className="font-medium text-gray-900 mb-3 block"
            >
              Key Results ({goal.keyResults.length})
            </Typography>
            <div className="space-y-2">
              {goal.keyResults.map((kr) => (
                <div
                  key={kr.id}
                  className="flex items-center justify-between gap-3 py-3 px-4 border border-gray-100 rounded-xl bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge label={kr.id} variant="purple-outline" size="sm" />
                    <Typography
                      variant="bodySmall"
                      className="text-gray-800 font-medium"
                    >
                      {kr.title}
                    </Typography>
                  </div>
                  <Typography
                    variant="caption"
                    className="text-gray-500 shrink-0"
                  >
                    Target {kr.target}
                  </Typography>
                </div>
              ))}
            </div>
          </div>

          {/* Add Comment */}
          <div>
            <Typography
              variant="bodySmall"
              className="font-medium text-gray-900 mb-2 block"
            >
              Add comment{" "}
              <span className="text-gray-400 font-normal">
                (visible to {goal.employeeName.split(" ")[0]})
              </span>
            </Typography>
            <textarea
              aria-label={`Add comment for ${goal.employeeName}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-sm"
            />
          </div>

          {/* Audit */}
          <div className="bg-slate-50 rounded-xl p-4 mb-2">
            <Typography
              variant="caption"
              className="uppercase tracking-wider text-gray-500 font-bold block mb-1.5"
            >
              AUDIT
            </Typography>
            <Typography variant="bodySmall" className="text-gray-500">
              {goal.auditLog}
            </Typography>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-1px_2px_rgba(15,23,42,0.04)]">
          <Typography variant="caption" className="text-gray-500">
            Auto-approves in {goal.autoApprovesInDays} days
          </Typography>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              bgColor="text"
              size="sm"
              onClick={onClose}
              className="h-9 w-[92px] bg-white px-0 text-xs font-semibold"
            >
              Send back
            </Button>
            <Button
              variant="outline"
              bgColor="error"
              size="sm"
              className="h-9 w-[70px] bg-white px-0 text-xs font-semibold"
            >
              Reject
            </Button>
            <Button
              variant="contain"
              bgColor="success"
              size="sm"
              onClick={onApprove}
              className="h-9 w-[110px] px-0 text-xs font-semibold"
            >
              Approve goal
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const TeamGoals: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  const [checkedGoals, setCheckedGoals] = useState<Set<string>>(
    new Set(APPROVAL_GOALS.filter((g) => g.checked).map((g) => g.id)),
  );
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set(["m1"]),
  );
  const [selectedGoal, setSelectedGoal] = useState<GoalDetailData | null>(null);

  const handleGoalClick = (baseGoal: any) => {
    setSelectedGoal({
      ...GOAL_DETAIL,
      id: baseGoal.id,
      title: baseGoal.title,
      status: baseGoal.status || "Submitted",
      employeeName: baseGoal.employeeName,
      employeeInitials: baseGoal.employeeInitials,
      weightage: baseGoal.weightage || GOAL_DETAIL.weightage,
    });
  };

  const handleApproveGoal = () => {
    setSelectedGoal(null);
    navigate("/webapp/performance-app/team-goals/assign-goal");
  };

  const totalGoals = 32;
  const totalReportees = 8;
  const pendingApproval = APPROVAL_GOALS.length;

  const toggleCheck = (id: string) => {
    setCheckedGoals((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleMember = (id: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };



  return (
    <main
      className={`min-h-full overflow-y-auto overflow-x-hidden bg-[#f6f8fb] font-sans ${isMobile ? "px-3 py-4" : isTablet ? "px-2 py-2" : "p-1"}`}
    >
      <div className="mx-auto w-full  space-y-4 sm:space-y-5">
        {/* Page Header */}
        <header className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className={`flex min-w-0 ${isCompact ? "flex-col gap-4" : "items-center justify-between gap-4"} border-b border-slate-100 p-4 sm:p-5`}>
            <div className="min-w-0">
              <Typography variant="h3" className="text-xl leading-tight text-slate-950 sm:text-2xl">
                Team Goals
              </Typography>
              <Typography variant="bodySmall" className="mt-1 block break-words text-slate-500">
                {totalGoals} goals across {totalReportees} reportees ·{" "}
                {pendingApproval} pending your approval
              </Typography>
            </div>
            <div
              className={`flex ${isCompact ? "w-full flex-col sm:flex-row" : "shrink-0 items-center"} gap-3`}
            >
              <Button
                variant="outline"
                bgColor="text"
                size="sm"
                className={`h-10 justify-center bg-white ${isCompact ? "w-full sm:w-fit" : ""}`}
              >
                Cascade from Org
              </Button>
              <Button
                variant="contain"
                bgColor="primary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                className={`h-10 justify-center ${isCompact ? "w-full sm:w-fit" : ""}`}
              >
                Assign Goal
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 p-4 sm:p-5">
            {[
              { icon: Target, label: "Goals", value: totalGoals },
              { icon: Users, label: "Reportees", value: totalReportees },
              { icon: Weight, label: "Pending", value: pendingApproval },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 sm:px-3">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <Typography variant="caption" className="truncate text-slate-500">
                    {label}
                  </Typography>
                </div>
                <Typography variant="bodySmall" className="mt-1 block font-semibold text-slate-950">
                  {value}
                </Typography>
              </div>
            ))}
          </div>
        </header>

        {/* Approval Queue Section */}
        <section className="overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm">
          <div
            className={`flex ${
              isCompact ? "flex-col gap-3" : "items-center justify-between"
            } border-b border-amber-100 bg-amber-50 px-4 py-4 sm:px-5`}
          >
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <Typography
                variant="bodySmall"
                className="min-w-0 font-semibold text-amber-900"
              >
                Approval Queue — {APPROVAL_GOALS.length} goals awaiting you
              </Typography>
              {!isMobile && (
                <Typography
                  variant="caption"
                  className="shrink-0 text-amber-800"
                >
                  - auto-approve in 2 days if no action
                </Typography>
              )}
            </div>
            <div
              className={`flex gap-3 ${isCompact ? "w-full flex-col sm:w-auto sm:flex-row" : "items-center"}`}
            >
              <Button
                variant="outline"
                bgColor="error"
                size="sm"
                className={isCompact ? "w-full sm:w-fit" : ""}
              >
                Reject all
              </Button>
              <Button
                variant="contain"
                bgColor="success"
                size="sm"
                className={isCompact ? "w-full sm:w-fit" : ""}
              >
                Approve all
              </Button>
            </div>
          </div>

          <div className={isCompact ? "space-y-3 bg-slate-50/60 p-3 sm:p-4" : "divide-y divide-gray-100"}>
            {APPROVAL_GOALS.map((goal) => (
              <article
                key={goal.id}
                onClick={() => handleGoalClick(goal)}
                className={`grid cursor-pointer gap-4 transition-colors hover:bg-gray-50 ${
                  isCompact
                    ? "grid-cols-[auto_1fr] rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    : "grid-cols-[auto_minmax(0,1fr)_120px_110px_260px] items-center px-5 py-4"
                }`}
              >
                <label
                  className={`flex h-4 w-4 items-start justify-center`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    aria-label={`Select ${goal.title}`}
                    type="checkbox"
                    checked={checkedGoals.has(goal.id)}
                    onChange={() => toggleCheck(goal.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-500 accent-blue-500 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge label={goal.type} variant="purple" size="sm" />
                    <Avatar
                      name={goal.employeeName}
                      fontSize="text-xs"
                      size="h-8 w-8"
                      avatarBgColor={
                        getInitialsBg(goal.employeeInitials).split(" ")[0]
                      }
                      avatarTextColor={
                        getInitialsBg(goal.employeeInitials).split(" ")[1]
                      }
                    />
                    <Typography variant="caption" className="text-gray-600">
                      {goal.employeeName}
                    </Typography>
                    {goal.warning && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        {goal.warning}
                      </span>
                    )}
                  </div>
                  <Typography
                    variant="bodySmall"
                    className={`font-semibold text-gray-900 ${isCompact ? "break-words" : "truncate"}`}
                  >
                    {goal.title}
                  </Typography>
                  <Typography variant="caption" className="text-gray-500">
                    Submitted {goal.submittedAgo}
                  </Typography>
                </div>

                <div className={isCompact ? "col-start-2 rounded-lg bg-slate-50 p-3" : ""}>
                  <Typography
                    variant="label"
                    className="mb-0.5 block font-semibold uppercase text-slate-500"
                  >
                    Weightage
                  </Typography>
                  <Typography
                    variant="bodyMedium"
                    className={`font-bold ${goal.weightage > 30 ? "text-red-600" : "text-gray-900"}`}
                  >
                    {goal.weightage}%
                  </Typography>
                </div>

                <div className={isCompact ? "col-start-2" : ""}>
                  <span className="inline-flex items-center rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Submitted
                  </span>
                </div>

                <div
                  className={`flex flex-wrap gap-2 ${isCompact ? "col-span-2 justify-center sm:col-start-2" : "justify-end"}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="outline"
                    bgColor="text"
                    size="sm"
                    className={
                      isCompact
                        ? "min-w-24 flex-1 bg-white sm:flex-none"
                        : "bg-white"
                    }
                  >
                    Send back
                  </Button>
                  <Button
                    variant="outline"
                    bgColor="error"
                    size="sm"
                    className={isCompact ? "min-w-24 flex-1 sm:flex-none" : ""}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="contain"
                    bgColor="success"
                    size="sm"
                    className={isCompact ? "min-w-24 flex-1 sm:flex-none" : ""}
                  >
                    Approve
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* All Team Goals Section */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <header
            className={`mb-4 flex min-w-0 ${isCompact ? "flex-col gap-3" : "items-start justify-between gap-4"}`}
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-3">
                <Typography variant="h4" className="font-bold text-slate-950">
                  All Team Goals
                </Typography>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {totalGoals}
                </span>
              </div>
              <Typography variant="caption" className="text-slate-500">
                Approved & in progress · grouped by reportee
              </Typography>
            </div>
            <div
              className={`flex flex-wrap gap-2 ${isCompact ? "w-full" : "shrink-0 justify-end"}`}
            >
              {statusSummary.map((item) => (
                <Badge
                  key={item.label}
                  label={item.label}
                  variant={item.variant}
                  size="sm"
                />
              ))}
            </div>
          </header>

          <div className="space-y-3">
            {TEAM_MEMBERS.map((member) => {
              const isExpanded = expandedMembers.has(member.id);
              return (
                <article
                  key={member.id}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <button
                    type="button"
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} ${member.name} goals`}
                    onClick={() => toggleMember(member.id)}
                    className="flex w-full items-start justify-between gap-3 bg-blue-50/70 px-4 py-3 text-left transition-colors hover:bg-blue-50 sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                      <Avatar
                        name={member.name}
                        size="h-8 w-8"
                        fontSize="text-xs"
                        avatarBgColor={
                          getInitialsBg(member.initials).split(" ")[0]
                        }
                        avatarTextColor={
                          getInitialsBg(member.initials).split(" ")[1]
                        }
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Typography
                            variant="bodySmall"
                            className="font-semibold text-slate-950"
                          >
                            {member.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            className="text-slate-500"
                          >
                            {member.designation} · {member.goalCount} goals ·{" "}
                            {member.avgProgress}% avg
                          </Typography>
                        </div>
                        {isCompact && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 w-28 overflow-hidden rounded-md bg-blue-100">
                              <div className="h-full rounded-md bg-blue-500" style={{ width: `${member.avgProgress}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-blue-700">{member.avgProgress}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className={`mt-2 h-4 w-4 shrink-0 text-slate-500 transition-transform sm:mt-0 ${isExpanded ? "rotate-90" : ""}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className={isCompact ? "space-y-2 bg-slate-50/60 p-3" : "divide-y divide-gray-50 px-4 py-2"}>
                      {member.goals.map((goal) => (
                        <div
                          key={goal.id}
                          onClick={() =>
                            handleGoalClick({
                              ...goal,
                              employeeName: member.name,
                              employeeInitials: member.initials,
                            })
                          }
                          className={`grid cursor-pointer gap-3 transition-colors hover:bg-slate-50 ${
                            isCompact
                              ? "grid-cols-1 rounded-lg border border-slate-100 bg-white p-3 shadow-sm"
                              : "grid-cols-[minmax(0,1fr)_220px] items-center py-3"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <CornerDownRight className="h-4 w-4 shrink-0 text-slate-300" />
                            <Badge
                              label={goal.type}
                              variant="purple"
                              size="sm"
                            />
                            <Typography
                              variant="bodySmall"
                              className={`min-w-0 text-slate-700 ${isCompact ? "break-words" : "truncate"}`}
                            >
                              {goal.title}
                            </Typography>
                          </div>
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="h-2 flex-1 overflow-hidden rounded-md bg-slate-200">
                              <div
                                className={`h-full rounded-md ${statusBarColor[goal.status]}`}
                                style={{ width: `${goal.progress}%` }}
                              />
                            </div>
                            <Badge
                              label={goal.status}
                              variant={statusVariant[goal.status]}
                              size="sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onApprove={handleApproveGoal}
        />
      )}
    </main>
  );
};

export default TeamGoals;
