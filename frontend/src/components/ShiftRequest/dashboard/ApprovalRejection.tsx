/* eslint-disable @typescript-eslint/no-explicit-any */
import formatToIndianDate from "../../../utils/formatToIndianDate";
import Button from "../../shared/atoms/Button";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { StatusBadge } from "../AllShiftsDashboard";

// Props type
type ApprovalRejectionQueueProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  onAction: (action: string, data: any) => void;
  onClick?: (data: any) => void;
  refetch?: () => void;
  loadingAction?: { id: string; action: string } | null;
};

const ApprovalRejectionQueue = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
}: ApprovalRejectionQueueProps) => {
  if (!data) return null;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];
  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];

  const getActionStyles = (action: string): { bg: string; text: string } => {
    const parsedAction = action.toLowerCase().trim();
    let styles = {
      bg: "gray-100",
      text: "gray-600",
    };
    switch (parsedAction) {
      case "approve":
        styles = {
          bg: "success-100",
          text: "success",
        };
        break;
      case "reject":
        styles = {
          bg: "error-50",
          text: "error",
        };

        break;
      default:
        styles = {
          bg: "gray-200",
          text: "gray-600",
        };
        break;
    }
    return styles;
  };

  const gridTemplateColumns = "8% 10% 10% 10% 10% 10% 10% 20%";

  return (
    <div
      className="grid items-center gap-4 px-6 h-16 border-b border-gray-200 hover:bg-primary/20 transition-colors cursor-pointer"
      style={{ gridTemplateColumns }}
      onClick={() => onClick?.(data)}
    >
      <div className="flex items-center">
        <input
          type="checkbox"
          className="accent-primary"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect?.(data?.todo_id)}
          disabled={
            isDisabled ||
            actionsWithForm?.includes("Approve") ||
            actionsWithForm?.includes("Reject")
          }
        />
      </div>
      <div className="truncate text-gray-900 font-medium text-sm text-start">
        <WrapperHoverCard employeeId={data?.reference_document.employee}>
          <span>{data.reference_document.employee_name}</span>
        </WrapperHoverCard>
      </div>
      <div className="flex text-gray-900 text-sm flex-col">
        <span>{data.reference_document.shift_type}</span>
        <span className="text-[12px] text-gray-700 whitespace-nowrap">
          {data.reference_document.custom_start_time &&
          data.reference_document.custom_end_time
            ? `${data.reference_document.custom_start_time} - ${data.reference_document.custom_end_time}`
            : "---"}
        </span>
      </div>
      <div className="flex items-center text-gray-900 text-sm">
        {formatToIndianDate(data.reference_document.from_date)}
      </div>
      <div className="flex items-center text-gray-900 text-sm">
        {formatToIndianDate(data.reference_document.to_date)}
      </div>
      <div className="flex items-center text-gray-900 text-sm">
        {formatToIndianDate(data?.due_date)}
      </div>

      <div className="flex items-center text-sm">
        <StatusBadge status={data.reference_document.status} />
      </div>
      <div className="flex w-full justify-start gap-2 whitespace-nowrap">
        {actions?.length &&
          actions.map((action: string) => {
            return (
              <Button
                key={action}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAction(action, data);
                }}
                bgColor={getActionStyles(action).bg}
                className={`text-${getActionStyles(action).text}`}
                disabled={
                  loadingAction?.id === data?.todo_id &&
                  loadingAction?.action === action
                }
              >
                {loadingAction?.id === data?.todo_id &&
                loadingAction?.action === action ? (
                  <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  action
                )}
              </Button>
            );
          })}
      </div>
    </div>
  );
};

export default ApprovalRejectionQueue;
