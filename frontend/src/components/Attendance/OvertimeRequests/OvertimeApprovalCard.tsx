/* eslint-disable @typescript-eslint/no-explicit-any */
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button, { ButtonColor } from "../../shared/atoms/Button";
import Tooltip from "../../shared/Tooltip";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { Link } from "react-router-dom";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import {
  sanitizeToPlainText,
  truncateByChars,
} from "../../../utils/sanitizeToPlainText";
import StatusBadge from "../../shared/atoms/statusBadge";

type ApprovalCardProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  onAction: (action: string, data: any) => void;
  refetch?: () => void;
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled?: boolean;
};
const OvertimeApprovalCard = ({
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
          text: "text-success-600",
        };
        break;
      case "reject":
        styles = {
          bg: "error" as ButtonColor,
          text: "text-error-600",
        };

        break;
      default:
        styles = {
          bg: "disabled" as ButtonColor,
          text: "text-gray-600",
        };
        break;
    }
    return styles;
  };

  const cleanDescription = sanitizeToPlainText(data?.description);
  const truncatedDescription = truncateByChars(cleanDescription);

  const gridTemplateColumns = isBulkSelectEnabled
    ? "0.5fr 1fr 1.5fr 1fr 1fr 1fr"
    : "1fr 1.5fr 1fr 1fr 1fr";

  return (
    <>
      {isDesktop ? (
        <div
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(data)}
        >
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
              <WrapperHoverCard employeeId={data?.reference_document?.employee}>
                {data?.reference_document?.employee_name ||
                  data?.reference_document?.employee}
              </WrapperHoverCard>
            </Typography>
          </Link>

          <Tooltip content={cleanDescription}>
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              {truncatedDescription}
            </Typography>
          </Tooltip>

          <Typography variant="bodySmall" className="font-medium text-center">
            {data?.due_date}
          </Typography>

          <div className="flex items-center justify-center">
            <Tooltip
              content={
                data?.status === "Open"
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
              status={data?.reference_document?.status}
              recordId={data?.todo_id}
              loadingAction={loadingAction}
              onAction={(action) => onAction(action, data)}
            />
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x-1 border-b-1 
               border-x-primary/20 border-b-primary/20 
               shadow-sm border-primary bg-white rounded-xl"
          onClick={() => {
            if (onClick) {
              onClick(data);
            }
          }}
        >
          <div className="p-4 flex items-start gap-3 w-full">
            {isBulkSelectEnabled && (
              <input
                type="checkbox"
                className="mt-1 accent-blue-500"
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
              <div className="flex items-start justify-between p-1">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col gap-1">
                    <Typography
                      variant="mobileCardLabel"
                      className="text-gray-500"
                    >
                      {data?.reference_document?.employee_name
                        ? "Employee Name"
                        : "Employee ID"}
                    </Typography>

                    <Typography
                      variant="mobileCardValue"
                      className="font-semibold text-gray-900"
                    >
                      {data?.reference_document?.employee_name ||
                        data?.reference_document?.employee}
                    </Typography>
                  </div>
                </div>
                <StatusBadge status={data?.status} />
              </div>

              <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-2">
                    <Typography variant="mobileCardLabel" className="block">
                      Allocated To
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {data?.username || data?.allocated_to}
                    </Typography>
                  </div>
                  <div className="flex flex-col gap-2 text-right">
                    <Typography variant="mobileCardLabel" className="block">
                      Due Date
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {data?.due_date}
                    </Typography>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Typography variant="mobileCardLabel" className="block">
                    Description
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {truncateByChars(cleanDescription, 40)}
                  </Typography>
                </div>
              </div>

              <div className="flex sm:flex-row sm:justify-start gap-2 mt-3">
                {actions?.length > 0 &&
                  data?.reference_document?.status === "Open" &&
                  actions.map((action: string) => (
                    <Button
                      variant="soft"
                      key={action}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAction(action, data);
                      }}
                      bgColor={getActionStyles(action).bg}
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
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OvertimeApprovalCard;
