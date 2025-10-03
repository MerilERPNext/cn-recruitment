/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from "date-fns";
import { StatusBadge } from "../AllShiftsDashboard";

// Props type
type ApprovalRejectionQueueProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data?: {
    custom_doctype_actions_with_form: any;
    creation: string;
    date: string | number | Date;
    priority: string;
    name: string;
    employee_name: string;
    shift_type: string;
    status: string;
    from_date: string | null;
    to_date: string | null;
    custom_doctype_actions?: string;
  } | null;
  onAction: (action: string, data: any) => void;
  onClick?: (data: any) => void;
  maxdatas?: number;
};

const ApprovalRejectedForMobile = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
}: ApprovalRejectionQueueProps) => {
  if (!data) return null;

  let actions: string[] = ["Approve", "Reject"];
  try {
    if (data.custom_doctype_actions) {
      const parsed = JSON.parse(data.custom_doctype_actions);
      if (Array.isArray(parsed)) {
        actions = parsed;
      }
    }
  } catch {
    // fallback remains ["Approve", "Reject"]
  }

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
  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];
  return (
    <div
      className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 hover:shadow-md transition cursor-pointer"
      onClick={() => onClick?.(data)}
    >
      {/* Checkbox + Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelect?.(data.name)}
            disabled={
              isDisabled ||
              actionsWithForm?.includes("Approve") ||
              actionsWithForm?.includes("Reject")
            }
          />
          <span className="font-semibold text-gray-900 text-sm">
            {data.name || "--"}
          </span>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {/* Details */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>
          <span className="font-medium">Date:</span>{" "}
          {data.date ? format(new Date(data.date), "yyyy-MM-dd") : "--"}
        </p>
        <p>
          <span className="font-medium">Priority:</span> {data.priority || "--"}
        </p>
        <p>
          <span className="font-medium">Request Date:</span>{" "}
          {data.creation ? format(new Date(data.creation), "dd/MM/yyyy") : "--"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-start gap-3 mt-3">
        {actions.map((action) => (
          <button
            key={action}
            className={getActionStyles(action)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAction(action, data);
            }}
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ApprovalRejectedForMobile;
