/* eslint-disable @typescript-eslint/no-explicit-any */
// import { useScreenSize } from "../../../../hooks/useScreenSize";
import { Link } from "react-router-dom";
import StatusBadge from "../../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../../shared/atoms/Typography";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import Tooltip from "../../../shared/Tooltip";

type Props = {
  actionsEnabled?: boolean;
  data: any;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onAction: (action: string, data: any) => void;
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled?: boolean;
  isActed?: boolean;
};

const TeamProofApprovalCard = ({
  actionsEnabled = false,
  data,
  onAction,
  onClick,
  loadingAction,
  isActed = false,
}: Props) => {
  const { isDesktop } = useScreenSize();

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data.custom_doctype_actions)
    : [];

  const gridTemplateColumns = "1fr 2fr 2fr 1fr 1fr 1fr 1fr";

  return (
    <>
      {isDesktop ? (<div
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
          <StatusBadge status={data?.todo_status === "Closed" && data?.reference_document?.custom_status !== "Rejected" ? "Approved" : data?.reference_document?.custom_status} />
        </div>
        <Tooltip
          content={data?.send_back_comment || "--"}
          triggerClassName="w-full truncate min-w-0 block"
        >
          <Typography
            variant="bodySmall"
            className="font-medium text-center truncate block w-full text-gray-700"
          >
            {data?.send_back_comment || "--"}
          </Typography>
        </Tooltip>
        {/* Actions */}
        <div
          className="flex justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {data?.todo_status === "Open" && !isActed ? (
            <TeamApprovalActionPill
              actionsEnabled={actionsEnabled}
              actions={actions}
              status={data?.status}
              recordId={data?.todo_id}
              loadingAction={loadingAction}
              onAction={(action) => onAction(action, data)}
            />
          ) : (
            <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-10 text-gray-600 text-xs font-medium w-fit">
              Action Taken
            </div>
          )}
        </div>
      </div>
      ) : (
        <div
          className="flex flex-col gap-2 p-4 border rounded hover:bg-primary/10 cursor-pointer"
          onClick={() => onClick?.(data)}
        >
          <div className="flex items-center justify-between">
            <Link
              to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`}
              target="_blank"
            >
              <Typography
                variant="bodyMedium"
                className="font-medium truncate"
              >
                <WrapperHoverCard employeeId={data?.reference_document?.employee}>
                  {data?.reference_document?.employee_name}
                </WrapperHoverCard>
              </Typography>
            </Link>
            <StatusBadge status={data?.status} />
          </div>

          <Typography variant="bodySmall" className="text-gray-500">
            {data?.reference_document?.doctype} - ₹{" "}
            {Number(
              data?.reference_document?.total_actual_amount
            ).toLocaleString("en-IN")}
          </Typography>
            <div>
              <Typography variant="mobileCardLabel">Sendback Comment</Typography>
              <Typography variant="mobileCardValue" className="text-gray-700">
                {data?.send_back_comment || "--"}
              </Typography>
            </div>
          {data?.todo_status === "Open" && !isActed ? (
            <TeamApprovalActionPill
              actionsEnabled={actionsEnabled}
              actions={actions}
              status={data?.status}
              recordId={data?.todo_id}
              loadingAction={loadingAction}
              onAction={(action) => onAction(action, data)}
            />
          ) : (
            <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-10 text-gray-600 text-xs font-medium w-fit">
              Action Taken
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TeamProofApprovalCard;
