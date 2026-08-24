import React, { useState } from "react";
import toast from "react-hot-toast";
import { Check, Eye, Undo2, X } from "lucide-react";
import Button from "../../../../shared/atoms/Button";
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
    approveTeamGoals(
      {
        payload: {
          items: [items],
          note: note || "",
        },
      },
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
    sendBackTeamGoal(
      {
        payload: {
          items: [items],
          note: noteText,
        },
      },
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
    rejectGoal(
      {
        payload: {
          items: [items],
          note: noteText,
        },
      },
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

  return (
    <>
      <div className={className || (isModel ? "flex flex-wrap items-center gap-3" : "flex items-center justify-center gap-1.5")}>
        {!isModel ? (
          <>
            {onViewGoal && canView && (
              <button
                type="button"
                title="View Goal"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewGoal();
                }}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {canApprove && (
              <button
                type="button"
                title="Approve Goal"
                disabled={disabled || isAnyLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  approveGoal();
                }}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-600 text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            {canReject && (
              <button
                type="button"
                title="Reject Goal"
                disabled={disabled || isAnyLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  setActionModalType("reject");
                }}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-red-500 text-white shadow-sm transition-all hover:bg-red-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {canSendBack && (
              <button
                type="button"
                title="Send Back"
                disabled={disabled || isAnyLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  setActionModalType("send_back");
                }}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <>
            {canSendBack && (
              <Button
                variant="outline"
                bgColor="text"
                size="sm"
                disabled={disabled || isAnyLoading}
                onClick={() => setActionModalType("send_back")}
                className="h-9 min-w-[92px] px-3 bg-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendBackTeamGoalLoading ? "Sending..." : "Send back"}
              </Button>
            )}
            {canReject && (
              <Button
                variant="outline"
                bgColor="error"
                size="sm"
                disabled={disabled || isAnyLoading}
                onClick={() => setActionModalType("reject")}
                className="h-9 min-w-[70px] px-3 bg-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectGoalLoading ? "Rejecting..." : "Reject"}
              </Button>
            )}
            {canApprove && (
              <Button
                variant="contain"
                bgColor="success"
                size="sm"
                disabled={disabled || isAnyLoading}
                onClick={approveGoal}
                className="h-9 min-w-[110px] px-3 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Approving..." : "Approve goal"}
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
