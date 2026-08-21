import React from "react";
import { X } from "lucide-react";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import Button from "../../../../shared/atoms/Button";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge, { type BadgeVariant } from "../../../../shared/Badge";
import Modal from "../../../../shared/Modal";
import Avatar from "../../../../shared/Avatar";
import { getInitials } from "../../../../../utils/helperUtils";
import type { TeamGoalItem, TeamGoalKeyResult } from "../../../../../types/goal";

export interface SelectedGoalDetail extends TeamGoalItem {
  employeeName: string;
  employeeInitials: string;
  designation?: string;
}

interface TeamGoalDetailModalProps {
  goal: SelectedGoalDetail;
  onClose: () => void;
  onApprove?: () => void;
  onSendBack?: () => void;
  onReject?: () => void;
}

const getHealthBadgeVariant = (tone?: string, health?: string): BadgeVariant => {
  if (tone === "danger" || health === "off_track") return "danger";
  if (tone === "warning" || health === "at_risk") return "warning";
  if (tone === "success" || health === "on_track") return "success";
  return "default";
};

export const TeamGoalDetailModal: React.FC<TeamGoalDetailModalProps> = ({
  goal,
  onClose,
  onApprove,
  onSendBack,
  onReject,
}) => {
  const { isMobile } = useScreenSize();

  const keyResults: TeamGoalKeyResult[] = goal.key_results || [];

  return (
    <Modal isOpen onClose={onClose} size="md">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              label={goal.methodology || "OKR"}
              variant="purple"
              size="sm"
            />
            <Badge
              label={goal.health_label || goal.health || "Approved"}
              variant={getHealthBadgeVariant(goal.health_tone, goal.health)}
              size="sm"
            />
            {goal.is_mandatory && (
              <Badge label="Mandatory" variant="warning" size="sm" />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Goal Title & Employee Info */}
          <div>
            <Typography variant="h3" className="font-bold text-slate-950 mb-2 break-words">
              {goal.title}
            </Typography>
            <div className="flex items-center gap-2.5">
              <Avatar
                name={goal.employeeName || getInitials(goal.employeeName)}
                size="h-8 w-8"
                fontSize="text-xs"
                avatarBgColor="bg-blue-50"
                avatarTextColor="text-blue-600"
              />
              <Typography variant="bodySmall" className="text-slate-500">
                <span className="font-medium text-slate-800">{goal.employeeName}</span>
                {goal.designation ? ` · ${goal.designation}` : ""}
              </Typography>
            </div>
          </div>

          {/* Meta Cards / Details Grid */}
          <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100`}>
            <div>
              <Typography variant="caption" className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">
                WEIGHTAGE
              </Typography>
              <Typography variant="bodySmall" className="font-semibold text-slate-900">
                {goal.weightage}%
              </Typography>
            </div>
            <div>
              <Typography variant="caption" className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">
                ACHIEVEMENT
              </Typography>
              <Typography variant="bodySmall" className="font-semibold text-slate-900">
                {goal.achievement}%
              </Typography>
            </div>
            <div>
              <Typography variant="caption" className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">
                EXPECTED
              </Typography>
              <Typography variant="bodySmall" className="font-semibold text-slate-900">
                {goal.expected_progress != null ? `${goal.expected_progress}%` : "-"}
              </Typography>
            </div>
            <div>
              <Typography variant="caption" className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">
                HEALTH
              </Typography>
              <Typography variant="bodySmall" className="font-semibold capitalize text-slate-900">
                {goal.health_label || goal.health || "-"}
              </Typography>
            </div>
          </div>

          {/* Description */}
          {goal.description && (
            <div>
              <Typography variant="bodySmall" className="font-semibold text-slate-900 mb-1.5 block">
                Description
              </Typography>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 overflow-hidden">
                <Typography variant="bodySmall" className="text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
                  {goal.description}
                </Typography>
              </div>
            </div>
          )}

          {/* Key Results */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Typography variant="bodySmall" className="font-semibold text-slate-900">
                Key Results ({keyResults.length})
              </Typography>
            </div>
            {keyResults.length > 0 ? (
              <div className="space-y-2">
                {keyResults.map((kr, index) => (
                  <div
                    key={kr.goal_key || index}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                        {index + 1}
                      </span>
                      <div>
                        <Typography variant="bodySmall" className="font-medium text-slate-900">
                          {kr.title}
                        </Typography>
                        {kr.metric && (
                          <Typography variant="caption" className="text-slate-500">
                            Metric: {kr.metric}
                          </Typography>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:shrink-0">
                      {kr.weightage > 0 && (
                        <span className="text-xs text-slate-500 font-medium">
                          Weightage: {kr.weightage}%
                        </span>
                      )}
                      {kr.target != null && (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          Target: {kr.target}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs italic text-slate-400">
                No key results added for this goal.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <Typography variant="caption" className="text-slate-500 font-medium">
            {goal.goal ? `Goal ID: ${goal.goal}` : "Team Goal Details"}
          </Typography>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onSendBack || onClose}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Send back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReject || onClose}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Reject
            </Button>
            <Button
              variant="contain"
              size="sm"
              onClick={onApprove || onClose}
              className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none font-semibold shadow-none"
            >
              Approve goal
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TeamGoalDetailModal;
