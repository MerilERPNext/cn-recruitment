/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from "date-fns";
import { StatusBadge } from "../AllShiftsDashboard";

// Props type
type ApprovalRejectionQueueProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data?: {
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

const ApprovalRejectionQueue = ({
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

  return (
    <div
      className="grid grid-cols-7 border-b border-gray-200 gap-4 w-full items-center px-4 h-14 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onClick?.(data)}
    >
      <div className="w-full ">
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect?.(data.name)}
          disabled={isDisabled}
        />
      </div>
      <div className="font-medium  text-gray-900 text-xs truncate">
        {data.name || "--"}
      </div>
      <div className="text-gray-700 text-xs truncate">
        {data.creation ? data.creation.split(" ")[0] : "--"}
      </div>
      <div>
        <StatusBadge status={data.status} />
      </div>
      <div className="text-gray-600 text-xs">
        {data.priority}
      </div>
      <div className="text-gray-600 text-xs">
        {data.date
          ? format(new Date(data.date), "dd/MM/yyyy")
          : "--"}
      </div>
      <div className="flex justify-start items-center ml-[-10px] gap-1">
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

export default ApprovalRejectionQueue;

