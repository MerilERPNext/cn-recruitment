/* eslint-disable @typescript-eslint/no-explicit-any */
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { Link } from "react-router-dom";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { formatCurrency } from "../../../utils/currency";
import { ActionWithCommentType } from "../../shared/ApprovalList";

// Props type
type BenefitRequestItemProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  onActionWithComments: ActionWithCommentType;
  onClick?: (data: any) => void;
  refetch?: () => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled: boolean;
};

const BenefitRequestItem = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  onActionWithComments,
  data,
  onClick,
  loadingAction,
  isBulkSelectEnabled,
}: BenefitRequestItemProps) => {
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

  const handleActionWithComments = (action: string) => {
    onActionWithComments(action, {
      todo_id: data?.todo_id,
      custom_open_chatnext_assistant_on_action: actionsWithForm.includes(action),
      custom_approval_type: data?.custom_approval_type ?? "Multi Actions",

    }, undefined,
      {
        docname: data?.reference_document?.name || data?.refrence_name || "",
      }
    );
  }

  return (
    <div>
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
              <WrapperHoverCard employeeId={data.reference_document.employee}>
                {data.reference_document.employee_name}
              </WrapperHoverCard>
            </Typography>
          </Link>

          <Typography variant="bodySmall" className="font-medium text-center">
            {data.reference_document.earning_component}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatCurrency(data.reference_document.claimed_amount)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatCurrency(data.reference_document.custom_max_amount)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data.reference_document.claim_date)}
          </Typography>
          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={data?.allocated_to}
              roles={data?.allocated_roles}
              allocated_to_user={data?.username}
              role={data?.role}
              position="left"
            >
              <StatusBadge
                status={
                  data.todo_status === "Closed" &&
                    data.reference_document.custom_status !== "Rejected"
                    ? "Approved"
                    : data.reference_document.custom_status
                }
              />
            </AllocatedToTooltip>
          </div>
          <div className="flex items-center justify-center">
            <TeamApprovalActionPill
              actions={actions}
              status={data.todo_status === "Closed" &&
                data.reference_document.custom_status !== "Rejected"
                ? "Approved"
                : data.reference_document.custom_status}
              recordId={data?.todo_id}
              loadingAction={loadingAction}
              onAction={handleActionWithComments}
            />
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-2xl mt-2 w-full"
          onClick={() => onClick?.(data)}
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

                  <Typography variant="mobileCardTitle" className="block mt-1">
                    {data.reference_document.earning_component}
                  </Typography>
                </div>
                <StatusBadge
                  status={
                    data.todo_status === "Closed" &&
                      data.reference_document.custom_status !== "Rejected"
                      ? "Approved"
                      : data.reference_document.custom_status
                  }
                />
              </div>
              <div className="flex justify-between mt-4">
                <div className="flex flex-col justify-start text-start">
                  <Typography variant="mobileCardLabel" className="block mt-1">
                    Employee Name
                  </Typography>
                  <Link
                    to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`}
                    target={isDesktop ? "_blank" : "_self"}
                  >
                    <Typography variant="mobileCardValue">
                      {data.reference_document.employee_name}
                    </Typography>
                  </Link>
                </div>
                <div className="flex flex-col justify-start text-end">
                  <Typography variant="mobileCardLabel" className="block mb-1">
                    Claimed amount
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatCurrency(data.reference_document.claimed_amount)}
                  </Typography>
                </div>
              </div>
              <div className="flex justify-between mt-4">

                <div className="flex flex-col justify-center text-start">
                  <Typography variant="mobileCardLabel" className="block mb-1">
                    Max eligible
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatCurrency(data.reference_document.custom_max_amount)}
                  </Typography>
                </div>
                <div className="flex flex-col justify-end text-right">
                  <Typography variant="mobileCardLabel" className="block mb-1">
                    Claim date
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatToIndianDate(data.reference_document.claim_date)}
                  </Typography>
                </div>
              </div>

              <div className="mt-4 w-full">
                <TeamApprovalActionPill
                  variant="buttons"
                  actions={actions}
                  status={data.todo_status === "Closed" &&
                    data.reference_document.custom_status !== "Rejected"
                    ? "Approved"
                    : data.reference_document.custom_status}
                  recordId={data?.todo_id}
                  loadingAction={loadingAction}
                  onAction={handleActionWithComments}
                />
              </div>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
};

export default BenefitRequestItem;
