import React, { useState } from "react";
import toast from "react-hot-toast";
import { Check, Eye, SendToBack, X } from "lucide-react";
import Button from "../../../../shared/atoms/Button";
import Tooltip from "../../../../shared/Tooltip";
import { GoalReasonModal } from "./GoalReasonModal";
import { useApproveTeamGoals, useRejectTeamGoals, useSendBackTeamGoals } from "../../../../../hooks/usePerformance";
import { getPerformanceErrorMessage } from "../../../../../services/performanceService";

export interface GoalActionItem {
  employee: string;
  goal_key: string;
}

export interface GoalActionButtonsProps {
  items: GoalActionItem;
  employees?: string[] | string;
  actions?: string[];
  note?: string;
  disabled?: boolean;
  onApprove?: () => void;
  onClose?: () => void;
  onViewGoal?: () => void;
  className?: string;
  isModel?: boolean;
  isEntirePlan?: boolean;
}

export const GoalActionButtons: React.FC<GoalActionButtonsProps> = ({
  items,
  actions,
  note,
  disabled = false,
  onApprove,
  onClose,
  onViewGoal,
  isModel = true,
  isEntirePlan = false,
  className,
}) => {
  const [actionModalType, setActionModalType] = useState<"send_back" | "reject" | null>(null);
  const hasActions = Boolean(actions && actions.length > 0);
  const { mutate: approveTeamGoals, isPending } = useApproveTeamGoals();
  const { mutate: rejectGoal, isPending: rejectGoalLoading } = useRejectTeamGoals();
  const { mutate: sendBackTeamGoal, isPending: sendBackTeamGoalLoading } = useSendBackTeamGoals();

  const isAnyLoading = isPending || rejectGoalLoading || sendBackTeamGoalLoading;

  const canView = !hasActions || actions!.includes("view");
  const canSendBack =
    !hasActions ||
    actions!.some((a) => ["send_back", "send_back_goals", "send_back_plan"].includes(a));
  const canReject =
    !hasActions ||
    actions!.some((a) => ["reject", "reject_goals", "reject_plan"].includes(a));
  const canApprove =
    !hasActions ||
    actions!.some((a) => ["approve", "approve_goals", "approve_plan"].includes(a));

  const approveGoal = () => {
    const payload = isEntirePlan && items.employee
      ? { employees: [items.employee] }
      : { items: [items], note: note || "" };

    approveTeamGoals(
      { payload },
      {
        onSuccess: (res) => {
          toast.success(res?.message || "Goal approved successfully.");
          if (onApprove) {
            onApprove();
          } else {
            onClose?.();
          }
        },
        onError: (err) => {
          toast.error(getPerformanceErrorMessage(err, "Failed to approve goal."));
        },
      }
    );
  };

  const submitSendBack = (noteText: string) => {
    const payload = isEntirePlan && items.employee
      ? { employees: [items.employee], note: noteText }
      : { items: [items], note: noteText };

    sendBackTeamGoal(
      { payload },
      {
        onSuccess: (res) => {
          toast.success(res?.message || "Goal sent back successfully.");
          setActionModalType(null);
          onClose?.();
        },
        onError: (err) => {
          toast.error(getPerformanceErrorMessage(err, "Failed to send back goal."));
        },
      }
    );
  };

  const submitReject = (noteText: string) => {
    const payload = isEntirePlan && items.employee
      ? { employees: [items.employee], note: noteText }
      : { items: [items], note: noteText };

    rejectGoal(
      { payload },
      {
        onSuccess: (res) => {
          toast.success(res?.message || "Goal rejected successfully.");
          setActionModalType(null);
          onClose?.();
        },
        onError: (err) => {
          toast.error(getPerformanceErrorMessage(err, "Failed to reject goal."));
        },
      }
    );
  };

  const actionItems: { key: string; element: React.ReactNode }[] = [];

  if (onViewGoal && canView) {
    actionItems.push({
      key: "view",
      element: (
        <Tooltip key="view" content="View Goal" position="top">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewGoal();
            }}
            className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Eye className="w-4 h-4 text-gray-600" strokeWidth={2} />
          </button>
        </Tooltip>
      ),
    });
  }

  if (canApprove) {
    actionItems.push({
      key: "approve",
      element: (
        <Tooltip key="approve" content="Approve Goal" position="top">
          <button
            type="button"
            disabled={disabled || isAnyLoading}
            onClick={(e) => {
              e.stopPropagation();
              approveGoal();
            }}
            className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-3xl animate-spin" />
            ) : (
              <Check className="w-4 h-4 text-green-600" strokeWidth={2} />
            )}
          </button>
        </Tooltip>
      ),
    });
  }

  if (canReject) {
    actionItems.push({
      key: "reject",
      element: (
        <Tooltip key="reject" content="Reject Goal" position="top">
          <button
            type="button"
            disabled={disabled || isAnyLoading}
            onClick={(e) => {
              e.stopPropagation();
              setActionModalType("reject");
            }}
            className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rejectGoalLoading ? (
              <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-3xl animate-spin" />
            ) : (
              <X className="w-4 h-4 text-red-500" strokeWidth={2} />
            )}
          </button>
        </Tooltip>
      ),
    });
  }

  if (canSendBack) {
    actionItems.push({
      key: "send_back",
      element: (
        <Tooltip key="send_back" content="Send Back" position="top">
          <button
            type="button"
            disabled={disabled || isAnyLoading}
            onClick={(e) => {
              e.stopPropagation();
              setActionModalType("send_back");
            }}
            className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendBackTeamGoalLoading ? (
              <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-3xl animate-spin" />
            ) : (
              <SendToBack className="w-4 h-4 text-amber-600" strokeWidth={2} />
            )}
          </button>
        </Tooltip>
      ),
    });
  }

  return (
    <>
      <div className={className || (isModel ? "flex flex-wrap items-center gap-3" : "flex items-center justify-center gap-1.5")}>
        {isEntirePlan ? (
          <>
            {canSendBack && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isAnyLoading}
                onClick={(e) => {
                  e?.stopPropagation?.();
                  setActionModalType("send_back");
                }}
                className="border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-100/80 active:bg-amber-200 text-xs px-2 sm:px-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendToBack className="h-3.5 w-3.5 mr-1 shrink-0 text-amber-600" />
                <span>{sendBackTeamGoalLoading ? "Sending..." : "Send Back"}</span>
              </Button>
            )}
            {canReject && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isAnyLoading}
                onClick={(e) => {
                  e?.stopPropagation?.();
                  setActionModalType("reject");
                }}
                className="border-red-300 text-red-700 bg-red-50/50 hover:bg-red-100/80 active:bg-red-200 text-xs px-2 sm:px-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-3.5 w-3.5 mr-1 shrink-0 text-red-600" />
                <span>{rejectGoalLoading ? "Rejecting..." : "Reject"}</span>
              </Button>
            )}
            {canApprove && (
              <Button
                type="button"
                variant="contain"
                size="sm"
                disabled={disabled || isAnyLoading}
                onClick={(e) => {
                  e?.stopPropagation?.();
                  approveGoal();
                }}
                className="border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs text-xs px-2 sm:px-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-3.5 w-3.5 mr-1 shrink-0 text-white" />
                <span>{isPending ? "Approving..." : "Approve"}</span>
              </Button>
            )}
          </>
        ) : !isModel ? (
          <div className="h-8 flex items-center gap-1 px-3 py-1 rounded-3xl bg-gray-10 w-fit">
            {actionItems.map(({ key, element }, index) => (
              <div key={key} className="flex items-center gap-2">
                {element}
                {index < actionItems.length - 1 && (
                  <span className="w-px h-4 bg-gray-300" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            {canSendBack && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isAnyLoading}
                onClick={() => setActionModalType("send_back")}
                className="border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-100/80 active:bg-amber-200 text-xs h-9 px-3.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendToBack className="h-3.5 w-3.5 mr-1.5 shrink-0 text-amber-600" />
                <span>{sendBackTeamGoalLoading ? "Sending..." : "Send back"}</span>
              </Button>
            )}
            {canReject && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isAnyLoading}
                onClick={() => setActionModalType("reject")}
                className="border-red-300 text-red-700 bg-red-50/50 hover:bg-red-100/80 active:bg-red-200 text-xs h-9 px-3.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-3.5 w-3.5 mr-1.5 shrink-0 text-red-600" />
                <span>{rejectGoalLoading ? "Rejecting..." : "Reject"}</span>
              </Button>
            )}
            {canApprove && (
              <Button
                type="button"
                variant="contain"
                size="sm"
                disabled={disabled || isAnyLoading}
                onClick={approveGoal}
                className="border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs text-xs h-9 px-3.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-3.5 w-3.5 mr-1.5 shrink-0 text-white" />
                <span>{isPending ? "Approving..." : "Approve goal"}</span>
              </Button>
            )}
          </>
        )}
      </div>

      <GoalReasonModal
        isOpen={actionModalType === "send_back"}
        onClose={() => setActionModalType(null)}
        onConfirm={submitSendBack}
        title="Send back Goal"
        description="Please enter a reason/note to send back this goal for revisions."
        placeholder="Enter reason to send back..."
        confirmText="Send back"
        loadingText="Sending..."
        confirmBgColor="primary"
        isLoading={sendBackTeamGoalLoading}
      />

      <GoalReasonModal
        isOpen={actionModalType === "reject"}
        onClose={() => setActionModalType(null)}
        onConfirm={submitReject}
        title="Reject Goal"
        description="Please enter a reason/note to reject this goal."
        placeholder="Enter reason for rejection..."
        confirmText="Reject"
        loadingText="Rejecting..."
        confirmBgColor="error"
        isLoading={rejectGoalLoading}
      />
    </>
  );
};

export default GoalActionButtons;
