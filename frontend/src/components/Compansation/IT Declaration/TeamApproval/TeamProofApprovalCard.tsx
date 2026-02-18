/* eslint-disable @typescript-eslint/no-explicit-any */
// import { useScreenSize } from "../../../../hooks/useScreenSize";
import { Link } from "react-router-dom";
import StatusBadge from "../../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../../shared/atoms/Typography";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";

type Props = {
  data: any;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onAction: (action: string, data: any) => void;
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled?: boolean;
};

const TeamProofApprovalCard = ({
  data,
  onAction,
  onClick,
  loadingAction,
}: Props) => {
//   const { isDesktop } = useScreenSize();

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data.custom_doctype_actions)
    : [];

  const gridTemplateColumns = "1fr 2fr 2fr 1fr 1fr 1fr";

  return (
    <div
      className="grid items-center gap-4 px-6 h-16 border-b hover:bg-primary/10 cursor-pointer"
      style={{ gridTemplateColumns }}
      onClick={() => onClick?.(data)}
    >
      {/* Checkbox */}


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

      <Typography variant="bodySmall" className="text-center">
        {data?.reference_document?.doctype}
      </Typography>

      <Typography variant="bodySmall" className="text-center text-gray-500">
        {data?.reference_document?.custom_tax_regime}
      </Typography>

      <Typography variant="bodySmall" className="text-center">
        ₹{" "}
        {Number(
          data?.reference_document?.total_actual_amount
        ).toLocaleString("en-IN")}
      </Typography>

      {/* Proof */}

      <div className="flex justify-center">
        <StatusBadge status={data?.status} />
      </div>

      {/* Actions */}
      <div
        className="flex justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <TeamApprovalActionPill
          actions={actions}
          status={data?.status}
          recordId={data?.todo_id}
          loadingAction={loadingAction}
          onAction={(action) => onAction(action, data)}
        />
      </div>
    </div>
  );
};

export default TeamProofApprovalCard;
