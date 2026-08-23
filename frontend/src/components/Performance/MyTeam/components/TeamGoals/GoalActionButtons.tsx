import React from "react";
import Button from "../../../../shared/atoms/Button";

export interface GoalActionItem {
  employee: string;
  goal_key: string;
}

export interface GoalActionButtonsProps {
  items?: GoalActionItem;
  employees?: string[] | string;
  actions?: string[];
  note?: string;
  disabled?: boolean;
  onSendBack?: () => void;
  onReject?: () => void;
  onApprove?: () => void;
  className?: string;
}

export const GoalActionButtons: React.FC<GoalActionButtonsProps> = ({
  actions,
  disabled = false,
  onSendBack,
  onReject,
  onApprove,
  className = "flex flex-wrap items-center gap-3",
}) => {
  const hasActions = Boolean(actions && actions.length > 0);

  const canSendBack =
    !hasActions ||
    actions!.some((a) => ["send_back", "send_back_goals", "send_back_plan"].includes(a));
  const canReject =
    !hasActions ||
    actions!.some((a) => ["reject", "reject_goals", "reject_plan"].includes(a));
  const canApprove =
    !hasActions ||
    actions!.some((a) => ["approve", "approve_goals", "approve_plan"].includes(a));

  return (
    <div className={className}>
      {canSendBack && (
        <Button
          variant="outline"
          bgColor="text"
          size="sm"
          disabled={disabled}
          onClick={onSendBack}
          className="h-9 w-[92px] bg-white px-0 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send back
        </Button>
      )}
      {canReject && (
        <Button
          variant="outline"
          bgColor="error"
          size="sm"
          disabled={disabled}
          onClick={onReject}
          className="h-9 w-[70px] bg-white px-0 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reject
        </Button>
      )}
      {canApprove && (
        <Button
          variant="contain"
          bgColor="success"
          size="sm"
          disabled={disabled}
          onClick={onApprove}
          className="h-9 w-[110px] px-0 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Approve goal
        </Button>
      )}
    </div>
  );
};

export default GoalActionButtons;
