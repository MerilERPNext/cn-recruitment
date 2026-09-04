import React from "react";
import { X } from "lucide-react";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge, { type BadgeVariant } from "../../../../shared/Badge";
import Modal from "../../../../shared/Modal";
import Avatar from "../../../../shared/Avatar";
import { getInitials } from "../../../../../utils/helperUtils";
import type { TeamGoalItem, TeamGoalKeyResult } from "../../../../../types/goal";
import { GoalActionButtons } from "./GoalActionButtons";

export interface SelectedGoalDetail extends TeamGoalItem {
  employee?: string;
  employeeName: string;
  employeeInitials: string;
  designation?: string;
}

interface TeamGoalDetailModalProps {
  goal: SelectedGoalDetail;
  onClose: () => void;
  onApprove?: () => void;
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
}) => {
  const { isMobile } = useScreenSize();

  const keyResults: TeamGoalKeyResult[] = goal.key_results || [];

  return (
    <Modal isOpen onClose={onClose} size="md">
      <div className="flex flex-col max-h-[90vh] bg-card text-text-title">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5">
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
            className="rounded-lg border border-border p-1 text-text-body2 hover:bg-slate-500/10 hover:text-text-title transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Goal Title & Employee Info */}
          <div>
            <Typography variant="h3" className="font-bold mb-2 break-words">
              {goal.title}
            </Typography>
            <div className="flex items-center gap-2.5">
              <Avatar
                name={goal.employeeName || getInitials(goal.employeeName)}
                size="h-8 w-8"
                fontSize="text-xs"
                avatarBgColor="bg-blue-500/20"
                avatarTextColor="text-primary"
              />
              <Typography variant="bodySmall" color="body2">
                <span className="font-medium text-text-title">{goal.employeeName}</span>
                {goal.designation ? ` · ${goal.designation}` : ""}
              </Typography>
            </div>
          </div>

          {/* Meta Cards / Details Grid */}
          <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-4 rounded-xl bg-app p-4 border border-border`}>
            <div>
              <Typography variant="caption" color="body2" className="block text-[11px] font-semibold tracking-wider uppercase mb-1">
                WEIGHTAGE
              </Typography>
              <Typography variant="bodySmall" className="font-semibold">
                {goal.weightage}%
              </Typography>
            </div>
            <div>
              <Typography variant="caption" color="body2" className="block text-[11px] font-semibold tracking-wider uppercase mb-1">
                ACHIEVEMENT
              </Typography>
              <Typography variant="bodySmall" className="font-semibold">
                {goal.achievement}%
              </Typography>
            </div>
            <div>
              <Typography variant="caption" color="body2" className="block text-[11px] font-semibold tracking-wider uppercase mb-1">
                EXPECTED
              </Typography>
              <Typography variant="bodySmall" className="font-semibold">
                {goal.expected_progress != null ? `${goal.expected_progress}%` : "-"}
              </Typography>
            </div>
            <div>
              <Typography variant="caption" color="body2" className="block text-[11px] font-semibold tracking-wider uppercase mb-1">
                HEALTH
              </Typography>
              <Typography variant="bodySmall" className="font-semibold capitalize">
                {goal.health_label || goal.health || "-"}
              </Typography>
            </div>
          </div>

          {/* Description */}
          {goal.description && (
            <div>
              <Typography variant="bodySmall" className="font-semibold mb-1.5 block">
                Description
              </Typography>
              <div className="rounded-xl border border-border bg-app p-4 overflow-hidden">
                <Typography variant="bodySmall" color="body2" className="leading-relaxed break-words whitespace-pre-wrap">
                  {goal.description}
                </Typography>
              </div>
            </div>
          )}

          {/* Key Results */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Typography variant="bodySmall" className="font-semibold">
                Key Results ({keyResults.length})
              </Typography>
            </div>
            {keyResults.length > 0 ? (
              <div className="space-y-2">
                {keyResults.map((kr, index) => (
                  <div
                    key={kr.goal_key || index}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <div>
                        <Typography variant="bodySmall" className="font-medium">
                          {kr.title}
                        </Typography>
                        {kr.metric && (
                          <Typography variant="caption" color="body2">
                            Metric: {kr.metric}
                          </Typography>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:shrink-0">
                      {kr.weightage > 0 && (
                        <Typography variant="caption" color="body2" className="font-medium">
                          Weightage: {kr.weightage}%
                        </Typography>
                      )}
                      {kr.target != null && (
                        <span className="rounded-md bg-slate-500/10 px-2 py-1 text-xs font-semibold text-text-title">
                          Target: {kr.target}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-center">
                <Typography variant="caption" color="body2" className="italic block">
                  No key results added for this goal.
                </Typography>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-6 py-4">
          <Typography variant="caption" color="body2" className="font-medium">
            {goal.goal ? `Goal ID: ${goal.goal}` : "Team Goal Details"}
          </Typography>
          <GoalActionButtons
            items={{
              employee: goal.employee || "",
              goal_key: goal.goal_key || "",
            }}
            onApprove={onApprove}
            onClose={onClose}
          />
        </div>
      </div>
    </Modal>
  );
};

export default TeamGoalDetailModal;
