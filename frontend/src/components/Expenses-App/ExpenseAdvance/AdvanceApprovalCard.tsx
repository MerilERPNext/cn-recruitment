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
import Tooltip from "../../shared/Tooltip";

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
  activeStatus?: string;
  isActed?: boolean;
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
  activeStatus = "Pending",
  isActed = false,
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
    ? activeStatus === "Approved"
      ? "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
      : "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
    : activeStatus === "Approved"
      ? "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
      : "1fr 1fr 1fr 1fr 1fr 1fr 1fr";

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
          <Tooltip
        content={data?.reference_document?.name || ""}
        triggerClassName="w-full truncate min-w-0 block"
      >
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate block w-full"
        >
          {data?.reference_document?.name}
        </Typography>
      </Tooltip>
          
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
            {formatToIndianDate(data?.due_date)}
          </Typography>

          {/* Status + Actions */}
          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={
                data?.reference_document?.custom_final_status === "Pending"
                  ? data?.allocated_to
                  : undefined
              }
              roles={
                data?.reference_document?.custom_final_status === "Pending"
                  ? data?.allocated_roles
                  : undefined
              }
              position="left"
            >
              <StatusBadge
                status={
                  data.todo_status === "Closed" &&
                  data.reference_document.custom_final_status !== "Rejected"
                    ? "Approved"
                    : data.reference_document.custom_final_status
                }
              />
            </AllocatedToTooltip>
          </div>
          {activeStatus === "Approved" && (
            <div className="flex items-center justify-center">
              <Typography
                variant="bodySmall"
                className={`font-medium text-center min-w-[70px] ${data?.status === "Paid" ? "text-green-600" : "text-amber-600"}`}
              >
                {data?.status === "Paid" ? (
                  <StatusBadge status={"Paid"} />
                ) : (
                  <StatusBadge status={"Unpaid"} />
                )}
              </Typography>
            </div>
          )}
          <div className="flex items-center justify-center">
            {activeStatus === "Pending" && !isActed ? (
              <TeamApprovalActionPill
                actions={actions}
                status={data?.reference_document?.custom_final_status}
                recordId={data?.todo_id}
                loadingAction={loadingAction}
                onAction={(action) => onAction(action, data)}
              />
            ) : (
              <div className="flex items-center justify-center">
                <Typography
                  variant="bodySmall"
                  className="font-medium text-center text-gray-500"
                >
                  <StatusBadge status={"Action taken"} />
                </Typography>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x border-b border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl"
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

            <div className="w-full flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">
                    {data?.reference_document?.employee_name
                      ? "Employee Name"
                      : "Employee ID"}
                  </Typography>
                  <Link
                    to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`}
                    target="_blank"
                  >
                    <Typography variant="mobileCardValue">
                      {data?.reference_document?.employee_name ||
                        data?.reference_document?.employee}
                    </Typography>
                  </Link>
                </div>
                <StatusBadge
                  status={
                    data.todo_status === "Closed" &&
                    data.reference_document.custom_final_status !== "Rejected"
                      ? "Approved"
                      : data.reference_document.custom_final_status
                  }
                />
              </div>

              {/* Category & Amount */}
              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">
                    Advance Amount
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {totalClaimedAmount}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <Typography variant="mobileCardLabel">Due Date</Typography>
                  <Typography variant="mobileCardValue">
                    {formatToIndianDate(data?.due_date)}
                  </Typography>
                </div>
              </div>

              {/* Allocated To */}
              <MobileAllocatedTo
                users={data?.allocated_to}
                roles={data?.allocated_roles}
                username={data?.username}
              />

              {activeStatus === "Approved" && (
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-1">
                    <Typography variant="mobileCardLabel">
                      Paid Status
                    </Typography>
                    <Typography
                      variant="bodySmall"
                      className={`font-medium w-fit ${data?.status === "Paid" ? "text-green-600" : "text-amber-600"}`}
                    >
                      {data?.status === "Paid" ? (
                        <StatusBadge status={"Paid"} />
                      ) : (
                        <StatusBadge status={"Unpaid"} />
                      )}
                    </Typography>
                  </div>
                </div>
              )}

              {activeStatus === "Draft" && !isActed ? (
                <TeamApprovalActionPill
                  variant="buttons"
                  actions={actions}
                  status={data?.reference_document?.custom_final_status}
                  recordId={data?.todo_id}
                  loadingAction={loadingAction}
                  onAction={(action) => onAction(action, data)}
                />
              ) : (
                <div className="bg-gray-50 px-3 py-1 rounded-md mt-2 w-fit mx-auto">
                  <Typography
                    variant="bodySmall"
                    className="text-center text-gray-100"
                  >
                    <StatusBadge status={"Action taken"} />
                  </Typography>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdvanceApprovalCard;
