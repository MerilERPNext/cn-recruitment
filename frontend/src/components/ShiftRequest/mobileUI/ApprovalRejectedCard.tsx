/* eslint-disable @typescript-eslint/no-explicit-any */
import { getActionStyles } from "../../../utils/actionButtonStyles";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import Button from "../../shared/atoms/Button";
import StatusBadge from "../../shared/atoms/statusBadge";

// Props type
type ApprovalRejectionQueueProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data?: any;
  onAction: (action: string, data: any) => void;
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
};

const ApprovalRejectedForMobile = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
}: ApprovalRejectionQueueProps) => {
  if (!data) return null;

  // ✅ Parsing consistent with desktop version
  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];
  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];

  return (
    <div
      className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 hover:shadow-md transition cursor-pointer"
      onClick={() => onClick?.(data)}
    >
      {/* Top Section: Title (Employee Name) and Status */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelect?.(data.todo_id)}
            disabled={
              isDisabled ||
              actionsWithForm?.includes("Approve") ||
              actionsWithForm?.includes("Reject")
            }
          />
        </div>
        <StatusBadge status={data?.reference_document?.status} />
      </div>

      {/* 2-Column Grid for Shift & Date Info */}
      <div className="flex justify-between gap-6">
        {/* Left Column */}
        <div>
          <div className="flex flex-col gap-1">
            <div className="card-title">Employee</div>
            <div className="card-subtitle">
              {data?.reference_document?.employee_name || "--"}
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <div className="card-title">Shift Type</div>
            <div className="card-subtitle">
              {data?.reference_document?.shift_type || "--"}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="text-right">
          <div className="flex flex-col gap-1">
            <div className="card-title">From</div>
            <div className="card-subtitle">
              {formatToIndianDate(data?.reference_document?.from_date)}
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <div className="card-title">To</div>
            <div className="card-subtitle">
              {formatToIndianDate(data?.reference_document?.to_date)}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-start gap-2 mt-4">
        {actions?.length > 0 &&
          actions.map((action: string) => {
            const actionStyle = getActionStyles(action);

            return (
              <Button
                key={action}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAction(action, data);
                }}
                bgColor={actionStyle.bgColor}
                variant={actionStyle.variant}
                disabled={
                  loadingAction?.id === data?.todo_id &&
                  loadingAction?.action === action
                }
                className="w-full"
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

export default ApprovalRejectedForMobile;
