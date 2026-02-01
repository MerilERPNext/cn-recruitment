/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from "react-router-dom";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import Tooltip from "../../shared/Tooltip";

// Props type
type ApprovalRejectionQueueProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  onAction: (action: string, data: any) => void;
  onClick?: (data: any) => void;
  refetch?: () => void;
  loadingAction?: { id: string; action: string } | null;
};

const ApprovalRejectionQueue = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
}: ApprovalRejectionQueueProps) => {
  if (!data) return null;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];
  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];


  const gridTemplateColumns = "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr";

  return (
    <div
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      style={{ gridTemplateColumns }}
      onClick={() => onClick?.(data)}
    >
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
        {data.reference_document.shift_type}
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
        <Tooltip
          content={
            data.reference_document.status === "Draft"
              ? `Allocated to : ${data?.allocated_to}`
              : ""
          }
        >
          <StatusBadge status={data.reference_document.status} />
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
  );
};

export default ApprovalRejectionQueue;
