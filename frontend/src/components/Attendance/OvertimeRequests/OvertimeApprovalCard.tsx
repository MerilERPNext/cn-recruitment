/* eslint-disable @typescript-eslint/no-explicit-any */
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button, { ButtonColor } from "../../shared/atoms/Button";
import Tooltip from "../../shared/Tooltip";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { Link } from "react-router-dom";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import {
  sanitizeToPlainText,
  truncateByChars,
} from "../../../utils/sanitizeToPlainText";

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

  const getStatus = (status: string) => {
    if (status === "Open") {
      return {
        label: "Pending",
        statusColor: "bg-yellow-100 text-yellow-600",
      };
    } else if (status === "Approved") {
      return {
        label: "Approved",
        statusColor: "bg-green-100 text-green-600",
      };
    } else if (status === "Rejected") {
      return {
        label: "Rejected",
        statusColor: "bg-red-100 text-red-600",
      };
    }
    return {
      label: status || "Unknown",
      statusColor: "bg-gray-100 text-gray-600",
    };
  };
  const status = getStatus(data?.status);
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
                {data?.username}
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
            {formatToIndianDate(data?.due_date)}
          </Typography>

          <div className="flex items-center justify-center">
            <Tooltip
              content={
                status?.label === "Pending"
                  ? `Allocated to : ${data?.allocated_to}`
                  : ""
              }
            >
              <Badge
                size="md"
                label={status?.label as string}
                backgroundColor={status?.statusColor}
              />
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
          className="cursor-pointer border-1 border-gray-200 bg-white rounded-xl"
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
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <p className="card-title">
                    {data?.reference_document?.employee}
                  </p>

                  <div className="flex gap-2">
                    {data?.due_date && (
                      <p className="card-subtitle">
                        Due Date - {formatToIndianDate(data?.due_date)}
                      </p>
                    )}
                  </div>
                  <p className="card-subtitle mt-1 line-clamp-2">
                    <span className="card-title">Description:</span>{" "}
                    <div
                      dangerouslySetInnerHTML={{ __html: cleanDescription }}
                    />
                  </p>
                </div>
                <Tooltip content={data?.allocated_to}>
                  <Badge
                    size="sm"
                    label={status?.label as string}
                    backgroundColor={status?.statusColor}
                  />
                </Tooltip>
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
