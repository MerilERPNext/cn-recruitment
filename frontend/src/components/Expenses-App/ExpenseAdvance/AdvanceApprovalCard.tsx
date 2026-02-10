/* eslint-disable @typescript-eslint/no-explicit-any */
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button from "../../shared/atoms/Button";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { getActionStyles } from "../../../utils/actionButtonStyles";
import { Link } from "react-router-dom";
import { Typography } from "../../shared/atoms/Typography";
import Tooltip from "../../shared/Tooltip";
import StatusBadge from "../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";

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

const AdvanceApprovalCard = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
  isBulkSelectEnabled = true,
}: ApprovalCardProps) => {
  const { isDesktop } = useScreenSize();
  const actions = (() => {
    try {
      return data?.custom_doctype_actions
        ? JSON.parse(data.custom_doctype_actions)
        : [];
    } catch (e) {
      console.error("Failed to parse custom_doctype_actions:", e);
      return [];
    }
  })();
  const actionsWithForm = (() => {
    try {
      const str = data?.custom_doctype_actions_with_form?.replace(/'/g, '"');
      return str ? JSON.parse(str) : [];
    } catch (e) {
      console.error("Failed to parse custom_doctype_actions_with_form:", e);
      return [];
    }
  })();

  const gridTemplateColumns = isBulkSelectEnabled
    ? "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr"
    : "1fr 1fr 1fr 1fr 1fr 1fr";

  const getStatus = (status: string) => {
    if (status === "Pending" || status === "Open" || status === "Draft") {
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
  const totalClaimedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(data?.reference_document?.advance_amount ?? 0);

  return (
    <>
      {isDesktop ? (
        <div
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 hover:bg-primary/10 transition-colors cursor-pointer"
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
                {data?.reference_document?.employee_name}
              </WrapperHoverCard>
            </Typography>
          </Link>

          <Typography variant="bodySmall" className="font-medium text-center">
            {data?.reference_document?.department}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {totalClaimedAmount}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {data?.due_date}
          </Typography>

          {/* Status + Actions */}
          <div className="flex items-center justify-center">
            <Tooltip
              content={
                status?.label === "Pending"
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
          className="cursor-pointer border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20  shadow-sm border-primary bg-white rounded-2xl"
          onClick={() => {
            if (onClick) {
              onClick(data);
            }
          }}
        >
          <div className="p-6 flex items-start gap-3 w-full">
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
                  <Link
                    to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`}
                    target="_blank"
                  >
                    <Typography variant="mobileCardTitle">
                      {data?.reference_document?.employee_name}
                    </Typography>
                  </Link>
                </div>

                <Badge
                  size="sm"
                  label={data?.status === "Draft" ? "Pending" : data?.status}
                  backgroundColor={status?.statusColor}
                />
              </div>
              <div className="flex flex-col items-start justify-between gap-3 mt-2 rounded-md p-1">
                <div className="flex justify-between items-center w-full">
                  <Typography
                    variant="mobileCardLabel"
                    className="w-1/2 truncate"
                  >
                    Category
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {data?.reference_document?.custom_expense_category || "-"}
                  </Typography>
                </div>
                <div className="flex justify-between items-center w-full">
                  <Typography
                    variant="mobileCardLabel"
                    className="w-1/2 truncate"
                  >
                    Advance Amount
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {totalClaimedAmount}
                  </Typography>
                </div>
                <div className="flex justify-between items-center w-full">
                  <Typography
                    variant="mobileCardLabel"
                    className="w-1/2 truncate"
                  >
                    Due Date
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {data?.due_date}
                  </Typography>
                </div>
              </div>

              <div className="flex sm:flex-row sm:justify-start gap-2 mt-4 mb-3">
                {actions?.length > 0 &&
                  data?.status !== "Approved" &&
                  data?.status !== "Rejected" &&
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
                        fullWidth
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
          </div>
        </div>
      )}
    </>
  );
};

export default AdvanceApprovalCard;
