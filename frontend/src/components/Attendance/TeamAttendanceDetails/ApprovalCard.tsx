import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button, { ButtonColor } from "../../shared/atoms/Button";
import DOMPurify from "dompurify";
import Tooltip from "../../shared/Tooltip";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { Typography } from "../../shared/atoms/Typography";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { Link } from "react-router-dom";

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
    action: string
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
    ? "5% 10% 15% 8% 8% 8% 10% 20%"
    : "12% 20% 10% 10% 10% 10% 20%";

  const getStatus = (status: string) => {
    if (status === "Pending" || status === "Open") {
      return {
        label: "Pending",
        statusColor: "bg-yellow-100 text-yellow-600",
      };
    } else if (status === "Approved") {
      return {
        label: "Approved",
        statusColor: "bg-green-100 text-green-600",
      };
    } else if (status === "Rejected" || status === "Cancelled") {
      return {
        label: status === "Cancelled" ? "Cancelled" : "Rejected",
        statusColor: "bg-red-100 text-red-600",
      };
    }
    return {
      label: status || "Unknown",
      statusColor: "bg-gray-100 text-gray-600",
    };
  };
  const cleanExplaination = DOMPurify.sanitize(
    data?.reference_document?.explanation || ""
  );
  const status = getStatus(data?.status);
  return (
    <>
      {isDesktop ? (
        <div
          className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 cursor-pointer hover:bg-primary/20"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(data)}
        >
          {/* Checkbox */}
          {isBulkSelectEnabled && (
            <div className="flex items-center justify-start">
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

          <WrapperHoverCard employeeId={data?.reference_document?.employee}>
            <Link to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`} target="_blank">
              <div className="truncate text-gray-900 font-medium text-sm text-start">
                {data?.reference_document?.employee_name}
              </div>
            </Link>
          </WrapperHoverCard>

          <div className="truncate text-gray-900 font-medium text-sm text-start line-clamp-1">
            <Typography variant="bodySmall" className="font-semibold tracking-tight">
              {cleanExplaination}
            </Typography>
          </div>

          {/* Date */}
          <div className="text-gray-700 text-sm text-start">
            <Typography variant="bodySmall" className="font-semibold tracking-tight">
              {formatToIndianDate(data?.reference_document?.from_date)}
            </Typography>
          </div>
          <div className="text-gray-700 text-sm text-start">
            <Typography variant="bodySmall" className="font-semibold tracking-tight">
              {formatToIndianDate(data?.reference_document?.to_date)}
            </Typography>
          </div>
          <div className="text-gray-700 text-sm text-start">
            <Typography variant="bodySmall" className="font-semibold tracking-tight">
              {formatToIndianDate(data?.due_date)}
            </Typography>
          </div>
          {/* Status + Actions */}
          <div className="flex items-center justify-start">
            <Tooltip content={`Allocated to : ${data?.allocated_to}`}>
              <Badge
                size="sm"
                label={status?.label as string}
                backgroundColor={status?.statusColor}
              />
            </Tooltip>
          </div>
          <div className="flex w-full justify-start gap-2">
            {actions?.length &&
              data?.status === "Pending" &&
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
                <div className="w-full">
                  <Link to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`} target="_blank">
                    <p className="card-title">
                      {data?.reference_document?.employee_name}
                    </p>
                  </Link>
                  {/* <p className="text-sm text-gray-500">{data?.todo_id} </p> */}
                </div>

                <Badge
                  size="sm"
                  label={status?.label as string}
                  backgroundColor={status?.statusColor}
                />
              </div>
              <div className="my-2 py-2">
                <div className="flex justify-between w-full ">
                  {/* Display From Date */}
                  {data?.reference_document?.from_date && (
                    <p className="text-sm text-gray-500 flex flex-col justify-center items-start">
                      <span className="card-title mb-1">From</span>
                      <span className="card-subtitle">
                        {formatToIndianDate(data?.reference_document?.from_date)}
                      </span>
                    </p>
                  )}

                  {/* Display To Date */}
                  {data?.reference_document?.to_date && (
                    <p className="text-sm text-gray-500 flex flex-col items-center">
                      <span className="card-title mb-1">To</span>
                      <span className="card-subtitle">
                        {formatToIndianDate(data?.reference_document?.to_date)}
                      </span>
                    </p>
                  )}
                  {data?.due_date && (
                    <p className="text-sm text-gray-500 flex flex-col items-end">
                      <span className="card-title mb-1">Due</span>
                      <span className="card-subtitle">
                        {formatToIndianDate(data?.due_date)}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex sm:flex-row sm:justify-start gap-2">
                {actions?.length > 0 &&
                  data?.status === "Pending" &&
                  actions.map((action: string) => (
                    <Button
                      variant="soft"
                      key={action}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAction(action, data);
                      }}
                      fullWidth
                      bgColor={getActionStyles(action).bg}
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
          </div>
        </div>
      )}
    </>
  );
};

export default ApprovalCard;
