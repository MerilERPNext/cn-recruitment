/* eslint-disable @typescript-eslint/no-explicit-any */
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { getActionStyles } from "../../../../utils/actionButtonStyles";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import Button from "../../../shared/atoms/Button";
import { StatusBadge } from "../../../ShiftRequest/AllShiftsDashboard";

export type ApprovalRejectionLoanProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  onAction: (action: string, data: any) => void;
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
};



const ApprovalRejectionAdvanceList = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
}: ApprovalRejectionLoanProps) => {
  const { isDesktop } = useScreenSize();

  if (!data) return null;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];

 

  /* ===================== DESKTOP UI (UNCHANGED) ===================== */
  if (isDesktop) {
    return (
      <div
        className="grid items-center gap-4 px-6 h-16 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
        style={{ gridTemplateColumns: "5% 15% 15% 10% 12% 12% 10% 13%" }}
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

        <div className="text-sm font-medium">
          {data?.reference_document?.employee_name}
        </div>

        <div>{data.reference_document.custom_advance_type}</div>

        <div className="text-sm">
          {data?.reference_document?.advance_amount}
        </div>

        <div>
          {formatToIndianDate(
            data.reference_document.custom_repayment_start_date
          )}
        </div>

        <div>{formatToIndianDate(data.reference_document.posting_date)}</div>

        <div>
          <StatusBadge status={data?.reference_document?.status} />
        </div>

        <div className="flex gap-2">
          {actions.map((action: string) => {
            const actionStyle = getActionStyles(action);

            return (
              <Button
                key={action}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(action, data);
                }}
                bgColor={actionStyle.bgColor}
                variant={actionStyle.variant}
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
  }

  /* ===================== MOBILE CARD UI ===================== */
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4 mb-3 shadow-sm"
      onClick={() => onClick?.(data)}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-sm">
            {data?.reference_document?.employee_name}
          </p>
          <p className="text-xs text-gray-500">
            {data?.reference_document?.custom_advance_type}
          </p>
        </div>

        <input
          type="checkbox"
          className="accent-blue-500 mt-1"
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

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
        <div>
          <span className="block text-gray-400">Amount</span>
          <span className="font-medium text-gray-800">
            {data?.reference_document?.advance_amount}
          </span>
        </div>

        <div>
          <span className="block text-gray-400">Status</span>
          <StatusBadge status={data?.reference_document?.status} />
        </div>

        <div>
          <span className="block text-gray-400">Start Date</span>
          {formatToIndianDate(
            data?.reference_document?.custom_repayment_start_date
          )}
        </div>

        <div>
          <span className="block text-gray-400">Posting Date</span>
          {formatToIndianDate(data?.reference_document?.posting_date)}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.map((action: string) => {
          const actionStyle = getActionStyles(action);

          return (
            <Button
              key={action}
              onClick={(e) => {
                e.stopPropagation();
                onAction(action, data);
              }}
              bgColor={actionStyle.bgColor}
              variant={actionStyle.variant}
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

export default ApprovalRejectionAdvanceList;
