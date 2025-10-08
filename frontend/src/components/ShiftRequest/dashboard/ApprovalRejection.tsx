/* eslint-disable @typescript-eslint/no-explicit-any */
import formatToIndianDate from "../../../utils/formatToIndianDate";
import Button from "../../shared/atoms/Button";
import { StatusBadge } from "../AllShiftsDashboard";

// Props type
type ApprovalRejectionQueueProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
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

  const getActionStyles = (action: string) => {
    const parsedAction = action.toLowerCase().trim();
    switch (parsedAction) {
      case "approve":
        return "px-2 py-1 text-xs font-medium rounded-lg text-green-600 bg-green-100 hover:bg-green-200 transition";
      case "reject":
        return "px-2 py-1 text-xs font-medium rounded-lg text-red-600 bg-red-100 hover:bg-red-200 transition";
      default:
        return "px-2 py-1 text-xs font-medium rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 transition";
    }
  };

  const gridTemplateColumns = "5% 15% 10% 8% 8% 8% 10% 20%";

  return (
    <div
      className="grid items-center gap-4 px-6 h-16 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
      style={{ gridTemplateColumns }}
      onClick={() => onClick?.(data)}
    >
      <div className="flex items-center">
        <input
          type="checkbox"
          className="accent-blue-500"
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
        {data.todo_id}
      </div>
      <div className="truncate text-gray-900 font-medium text-sm text-start">
        {data.reference_document.employee_name}
      </div>
      <div className="flex items-center text-gray-700 text-xs">
        {data.reference_document.shift_type}
      </div>
      <div className="flex items-center">
        <StatusBadge status={data.reference_document.status} />
      </div>
      <div className="flex items-center text-gray-600 text-xs">
        {formatToIndianDate(data.reference_document.from_date)}
      </div>
      <div className="flex items-center text-gray-600 text-xs">
        {formatToIndianDate(data.reference_document.to_date)}
      </div>
      <div className="flex w-full justify-start gap-2 whitespace-nowrap">
        {actions?.length &&
          actions.map((action: string) => (
            <Button
              key={action}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAction(action, data);
              }}
              bgColor={getActionStyles(action)}
              textColor={getActionStyles(action)}
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
          ))}
      </div>
    </div>
  );
};

export default ApprovalRejectionQueue;
