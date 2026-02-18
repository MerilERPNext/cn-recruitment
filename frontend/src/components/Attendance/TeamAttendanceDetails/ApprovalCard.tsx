import { useScreenSize } from "../../../hooks/useScreenSize";
import Button, { ButtonColor } from "../../shared/atoms/Button";
import Tooltip from "../../shared/Tooltip";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { Typography } from "../../shared/atoms/Typography";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { Link } from "react-router-dom";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import {
  sanitizeToPlainText,
  truncateByChars,
} from "../../../utils/sanitizeToPlainText";
import StatusBadge from "../../shared/atoms/statusBadge";

type ApprovalCardProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, data: any) => void;
  refetch?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled?: boolean;
};
const ApprovalCard = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
  isBulkSelectEnabled,
}: ApprovalCardProps) => {
  const { isDesktop } = useScreenSize();
  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];
  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];

  const getActionStyles = (
    action: string,
  ): { bg: ButtonColor; text: string } => {
    const parsedAction = action.toLowerCase().trim();
    let styles = {
      bg: "disabled" as ButtonColor,
      text: "gray-600",
    };
    switch (parsedAction) {
      case "approve":
        styles = {
          bg: "success" as ButtonColor,
          text: "green-600",
        };
        break;
      case "reject":
        styles = {
          bg: "error" as ButtonColor,
          text: "red-600",
        };

        break;
      default:
        styles = {
          bg: "disabled" as ButtonColor,
          text: "gray-600",
        };
        break;
    }
    return styles;
  };

  const gridTemplateColumns = isBulkSelectEnabled
    ? "0.5fr 1fr 1.5fr 1fr 1fr 1fr 1fr 1fr"
    : "1fr 1.5fr 1fr 1fr 1fr 1fr 1fr";

  const cleanExplaination = sanitizeToPlainText(
    data?.reference_document?.explanation,
  );
  const truncatedExplaination = truncateByChars(cleanExplaination);
  return (
    <>
      {isDesktop ? (
        <div
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(data)}
        >
          {/* Checkbox */}
          {isBulkSelectEnabled && (
            <div className="flex items-center justify-center">
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
          )}

          <Link
            to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`}
            target="_blank"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              {" "}
              <WrapperHoverCard employeeId={data?.reference_document?.employee}>
                {data?.reference_document?.employee_name ||
                  data?.reference_document?.employee}
              </WrapperHoverCard>
            </Typography>
          </Link>
          <Tooltip content={cleanExplaination}>
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              {truncatedExplaination}
            </Typography>
          </Tooltip>

          {/* Date */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.from_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.to_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.due_date)}
          </Typography>

          {/* Status + Actions */}
          <div className="flex items-center justify-center">
            <Tooltip
              content={
                data?.status === "Pending"
                  ? `Allocated to : ${data?.allocated_to}`
                  : ""
              }
            >
              <StatusBadge status={data?.status} />
            </Tooltip>
          </div>
          <div className="flex items-center justify-center">
            <TeamApprovalActionPill
              actions={actions}
              status={data?.status}
              recordId={data?.todo_id}
              loadingAction={loadingAction}
              onAction={(action) => onAction(action, data)}
            />
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x border-b 
      border-x-primary/20 border-b-primary/20 
      shadow-sm border-primary bg-white rounded-xl"
          onClick={() => onClick?.(data)}
        >
          <div className="p-4 flex items-start gap-3 w-full">
            {isBulkSelectEnabled && (
              <input
                type="checkbox"
                className="mt-1 accent-primary"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleSelect?.(data?.todo_id)}
                disabled={
                  isDisabled ||
                  actionsWithForm?.includes("Approve") ||
                  actionsWithForm?.includes("Reject")
                }
              />
            )}

            <div className="w-full">
              {/* Header */}
              <div className="flex items-start justify-between p-1">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">
                    {data?.reference_document?.employee_name
                      ? "Employee Name"
                      : "Employee ID"}
                  </Typography>

                  <Typography
                    variant="mobileCardValue"
                    className="font-semibold"
                  >
                    {data?.reference_document?.employee_name ||
                      data?.reference_document?.employee}
                  </Typography>
                </div>

                <StatusBadge status={data?.status} />
              </div>

              {/* Info Section */}
              <div className="flex flex-col mt-2 p-1 gap-3">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-1">
                    <Typography variant="mobileCardLabel">
                      Allocated To
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {data?.username || data?.allocated_to}
                    </Typography>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <Typography variant="mobileCardLabel">Due Date</Typography>
                    <Typography variant="mobileCardValue">
                      {formatToIndianDate(data?.due_date)}
                    </Typography>
                  </div>
                </div>

                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-1">
                    <Typography variant="mobileCardLabel">From</Typography>
                    <Typography variant="mobileCardValue">
                      {formatToIndianDate(data?.reference_document?.from_date)}
                    </Typography>
                  </div>

                  <div className="flex flex-col gap-1 text-right">
                    <Typography variant="mobileCardLabel">To</Typography>
                    <Typography variant="mobileCardValue">
                      {formatToIndianDate(data?.reference_document?.to_date)}
                    </Typography>
                  </div>
                </div>
              </div>

              {/* Explanation (if exists) */}
              <div className="mt-3 flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Explanation</Typography>
                <Typography variant="mobileCardValue">
                  {truncateByChars(cleanExplaination, 40)}
                </Typography>
              </div>

              {/* Actions */}
              {actions?.length > 0 && data?.status === "Pending" && (
                <div className="flex gap-2 mt-3">
                  {actions.map((action: string) => {
                    const actionStyle = getActionStyles(action);

                    return (
                      <Button
                        key={action}
                        className="w-full"
                        variant="soft"
                        bgColor={actionStyle.bg}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onAction(action, data);
                        }}
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
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ApprovalCard;
