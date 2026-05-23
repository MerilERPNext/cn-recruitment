/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import StatusBadge from "../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import WrapperHoverCard from "../../shared/WrapperHoverCard";

// Props type
type ApprovalRejectionQueueProps = {
  actionsEnabled?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  onAction: (action: string, data: any) => void;
  onClick?: (data: any) => void;
  refetch?: () => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled?: boolean;
  isActed?: boolean;
};

const ApprovalRejectionQueue = ({
  actionsEnabled = true,
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
  isBulkSelectEnabled,
  isActed = false,
}: ApprovalRejectionQueueProps) => {
  const { isDesktop } = useScreenSize();

  if (!data) return null;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];
  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];

  const gridTemplateColumns = isBulkSelectEnabled
    ? "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
    : "1fr 1fr 1fr 1fr 1fr 1fr 1fr";

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
                className="accent-primary"
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
              <WrapperHoverCard employeeId={data?.reference_document.employee}>
                {data.reference_document.employee_name}
              </WrapperHoverCard>
            </Typography>
          </Link>
          <Typography variant="bodySmall" className="font-medium text-center">
            {data.reference_document.shift_name}
            <Typography variant="bodySmall" className="font-medium text-center">
              {data.reference_document.custom_start_time &&
              data.reference_document.custom_end_time
                ? `${data.reference_document.custom_start_time} - ${data.reference_document.custom_end_time}`
                : ""}
            </Typography>
          </Typography>

          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data.reference_document.from_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data.reference_document.to_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.due_date)}
          </Typography>

          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={data?.allocated_to}
              RoleAssignedUsers={data?.role_assigned_users}
              roles={data?.allocated_roles}
              allocated_to_user={data?.allocated_to_user}
              role={data?.role}
              position="left"
            >
              <StatusBadge
                status={
                  data.todo_status === "Closed" &&
                  data.reference_document.status !== "Rejected"
                    ? "Approved"
                    : data.reference_document.status
                }
              />
            </AllocatedToTooltip>
          </div>
          <div className="flex items-center justify-center">
            {data?.todo_status === "Open" && !isActed ? (
              <TeamApprovalActionPill
                actionsEnabled={actionsEnabled}
                actions={actions}
                status={data?.reference_document?.status}
                recordId={data?.todo_id}
                loadingAction={loadingAction}
                onAction={(action) => onAction(action, data)}
              />
            ) : (
              <div className="flex items-center justify-center">
                <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-10 text-gray-600 text-xs font-medium w-fit">
                  Action Taken
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x border-b  border-x-primary/20 border-b-primary/20  shadow-sm border-primary bg-white rounded-xl"
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

                <StatusBadge
                  status={
                    data.todo_status === "Closed" &&
                    data.reference_document.status !== "Rejected"
                      ? "Approved"
                      : data.reference_document.status
                  }
                />
              </div>

              {/* Info Section */}
              <div className="flex flex-col mt-2 p-1 gap-3">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-1">
                    <Typography variant="mobileCardLabel">
                      Shift Type
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {data?.reference_document?.shift_name || "--"}
                    </Typography>
                  </div>

                  <div className="flex flex-col gap-1 text-right">
                    <Typography variant="mobileCardLabel">
                      Shift Time
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {data?.reference_document?.custom_start_time &&
                        data?.reference_document?.custom_end_time && (
                          <div className="flex flex-col gap-1">
                            {`${data.reference_document.custom_start_time} - ${data.reference_document.custom_end_time}`}
                          </div>
                        )}
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

                <div className="flex justify-between w-full mt-1">
                  <MobileAllocatedTo
                    users={data?.allocated_to}
                    roles={data?.allocated_roles}
                    username={data?.username}
                    role={data?.role}
                    align="left"
                    RoleAssignedUsers={data?.role_assigned_users}
                  />
                </div>
              </div>

              {data?.todo_status === "Open" && !isActed ? (
                <TeamApprovalActionPill
                  actionsEnabled={actionsEnabled}
                  variant="buttons"
                  actions={actions}
                  status={data?.reference_document?.status}
                  recordId={data?.todo_id}
                  loadingAction={loadingAction}
                  onAction={(action) => onAction(action, data)}
                />
              ) : (
                <div className="flex items-center justify-center">
                  <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-10 text-gray-600 text-xs font-medium w-fit">
                    Action Taken
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ApprovalRejectionQueue;
