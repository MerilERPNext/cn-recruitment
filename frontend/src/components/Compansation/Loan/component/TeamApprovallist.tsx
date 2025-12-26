/* eslint-disable @typescript-eslint/no-explicit-any */
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import Button from "../../../shared/atoms/Button";
import { StatusBadge } from "../../../ShiftRequest/AllShiftsDashboard";
import { useScreenSize } from "../../../../hooks/useScreenSize";

export type ApprovalRejectionLoanProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  onAction: (action: string, data: any) => void;
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
};

const ApprovalRejectionLoanList = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
}: ApprovalRejectionLoanProps) => {
  const { isMobile } = useScreenSize();

  if (!data) return null;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];

  const getActionStyles = (action: string) => {
    const a = action.toLowerCase();
    if (a === "approve") return { bg: "green-100", text: "green-600" };
    if (a === "reject") return { bg: "red-100", text: "red-600" };
    return { bg: "gray-200", text: "gray-600" };
  };

  /* ===================== MOBILE UI ===================== */
  if (isMobile) {
    return (
      <div
        className="bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm"
        onClick={() => onClick?.(data)}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-sm font-semibold">
              {data?.reference_document?.applicant_name ||
                data?.reference_document?.applicant}
            </p>
            <p className="text-xs text-gray-500">
              {data?.reference_document?.loan_product}
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

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-3">
          <div>
            <span className="block text-gray-400">Amount</span>
            <span className="font-medium text-gray-800">
              {data?.reference_document?.loan_amount}
            </span>
          </div>

          <div>
            <span className="block text-gray-400">Interest</span>
            <span className="font-medium text-gray-800">
              {data?.reference_document?.rate_of_interest}%
            </span>
          </div>

          <div>
            <span className="block text-gray-400">Start Date</span>
            {formatToIndianDate(
              data?.reference_document?.custom_repayment_start_date
            )}
          </div>

          <div>
            <span className="block text-gray-400">Status</span>
            <StatusBadge status={data?.reference_document?.status} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {actions.map((action: string) => (
            <Button
              key={action}
              onClick={(e) => {
                e.stopPropagation();
                onAction(action, data);
              }}
              bgColor={getActionStyles(action).bg}
              textColor={getActionStyles(action).text}
              disabled={
                loadingAction?.id === data?.todo_id &&
                loadingAction?.action === action
              }
              className="flex-1"
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
  }

  /* ===================== DESKTOP UI (UNCHANGED) ===================== */
  return (
    <div
      className="grid items-center gap-4 px-6 h-16 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
      style={{
        gridTemplateColumns:
          "5% 8% 8% 8% 8% 10% 8% 8% 8% 20%",
      }}
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
        {data?.reference_document?.applicant_name ||
          data?.reference_document?.applicant}
      </div>

      <div className="text-sm">
        {data?.reference_document?.loan_product}
      </div>

      <div>{data?.reference_document?.loan_amount}</div>
      <div>{data?.reference_document?.rate_of_interest}%</div>
      <div>{data?.reference_document?.total_payable_interest}</div>

      <div>
        {formatToIndianDate(
          data?.reference_document?.custom_repayment_start_date
        )}
      </div>

      <div>
        {formatToIndianDate(data?.reference_document?.posting_date)}
      </div>

      <div>
        <StatusBadge status={data?.reference_document?.status} />
      </div>

      <div className="flex gap-2">
        {actions.map((action: string) => (
          <Button
            key={action}
            onClick={(e) => {
              e.stopPropagation();
              onAction(action, data);
            }}
            bgColor={getActionStyles(action).bg}
            textColor={getActionStyles(action).text}
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

export default ApprovalRejectionLoanList;
