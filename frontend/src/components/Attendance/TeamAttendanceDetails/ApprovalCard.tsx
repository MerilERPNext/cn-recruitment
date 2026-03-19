import { Link } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import {
  sanitizeToPlainText,
  truncateByChars,
} from "../../../utils/sanitizeToPlainText";
import StatusBadge from "../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import Tooltip from "../../shared/Tooltip";
import WrapperHoverCard from "../../shared/WrapperHoverCard";

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
            <AllocatedToTooltip
              users={data?.status === "Pending" ? data?.allocated_to : undefined}
              roles={data?.status === "Pending" ? data?.allocated_roles : undefined}
              position="left"
            >
              <StatusBadge status={data?.status} />
            </AllocatedToTooltip>
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

                  <Typography variant="mobileCardValue">
                    {data?.reference_document?.employee_name ||
                      data?.reference_document?.employee}
                  </Typography>
                </div>

                <StatusBadge status={data?.status} />
              </div>

              {/* Info Section */}
              <div className="flex flex-col mt-2 p-1 gap-3">
                <div className="flex justify-between w-full">
                  <MobileAllocatedTo
                    users={data?.username ? [data.username] : []}
                    roles={data?.allocated_roles}
                    username={data?.username}
                    allocated_to={data?.allocated_to}
                  />
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
              <TeamApprovalActionPill
                variant="buttons"
                actions={actions}
                status={data?.status}
                recordId={data?.todo_id}
                loadingAction={loadingAction}
                onAction={(action) => onAction(action, data)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ApprovalCard;
