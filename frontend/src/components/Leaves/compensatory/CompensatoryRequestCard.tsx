import toast from "react-hot-toast";
import { usePayCompOff } from "../../../hooks/useLeaves";
import { useScreenSize } from "../../../hooks/useScreenSize";
import {
  sanitizeToPlainText,
  truncateByChars,
} from "../../../utils/sanitizeToPlainText";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";
import StatusBadge from "../../shared/atoms/statusBadge";
import { Typography } from "../../shared/atoms/Typography";
import Tooltip from "../../shared/Tooltip";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import { RoleAssignedUsersType } from "../../../types/flows";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import formatToIndianDate from "../../../utils/formatToIndianDate";
export type CompensatoryRequestItem = {
  name: string;
  leave_type: string;
  custom_status: "issued" | "allocated" | "expired" | string;
  work_from_date: string;
  work_end_date: string;
  reason?: string;
  pay_button_required: boolean;
  docstatus: number;
  allocated_to?: string[];
  allocated_roles?: string[];
  allocated_to_user: string;
  role_assigned_users?: RoleAssignedUsersType[];
};

type CompensatoryRequestCardProps = {
  item: CompensatoryRequestItem;
  onClick?: () => void;
};

const CompensatoryRequestCard = ({
  item,
  onClick,
}: CompensatoryRequestCardProps) => {
  const { isDesktop } = useScreenSize();
  const { mutate: payCompOff, isPending } = usePayCompOff();

  const handlePay = () => {
    payCompOff(item.name, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSuccess: (response: any) => {
        toast.success(
          `Payment request successful: ${response.message || item.name}`,
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toast.error(errorResponseFormater(error) as any);
      },
    });
  };

  const resolveCompOffStatus = (customStatus?: string, docstatus?: number) => {
    const status = customStatus?.toLowerCase().trim();

    if (status === "issued" && (docstatus === 0 || docstatus === 1)) {
      return "issued";
    }

    if (status === "allocated" && docstatus === 1) {
      return "allocated";
    }

    if (status === "expired") {
      return "expired";
    }

    return customStatus || "unknown";
  };

  const cleanReason = sanitizeToPlainText(item.reason);
  const truncatedReason = truncateByChars(cleanReason);


  return isDesktop ? (
    <div
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1.5fr 1fr 1fr" }}
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      onClick={onClick}
    >
      <Typography variant="bodySmall" className="font-medium text-center">
        {item.leave_type}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(item.work_from_date)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(item.work_end_date)}
      </Typography>

      <Tooltip content={cleanReason}>
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate"
        >
          {truncatedReason}
        </Typography>
      </Tooltip>

      <div className="flex items-center justify-center">
        <AllocatedToTooltip
          users={item?.allocated_to}
          RoleAssignedUsers={item?.role_assigned_users}
          roles={item?.allocated_roles}
          position="left"
        >
          <StatusBadge
            status={resolveCompOffStatus(item?.custom_status, item?.docstatus)}
          />
        </AllocatedToTooltip>

      </div>

      <div className="flex items-center justify-center">
        <MyApprovalActionPill
          uiPermission={{
            app: "Leaves and Holidays",
            page: "Compensatory",
            actionKeysMap: {
              pay: "pay"
            }
          }}
          canPay={item?.pay_button_required}
          onPay={handlePay}
          payLoading={isPending}
        />
      </div>
    </div>
  ) : (
    <div
      className="cursor-pointer border-t-4 border-x border-b 
      border-x-primary/20 border-b-primary/20 
      shadow-sm border-primary bg-white rounded-xl mt-2"
      onClick={onClick}
    >
      <div className="p-4 flex flex-col gap-4 w-full">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Leave Type</Typography>

            <Typography variant="mobileCardValue" className="font-semibold">
              {item?.leave_type}
            </Typography>
          </div>

          <StatusBadge
            status={resolveCompOffStatus(item?.custom_status, item?.docstatus)}
          />
        </div>

        {/* Date Range */}
        <div className="flex justify-between w-full">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">From</Typography>
            <Typography variant="mobileCardValue">
              {formatToIndianDate(item.work_from_date)}
            </Typography>
          </div>

          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">To</Typography>
            <Typography variant="mobileCardValue">
              {formatToIndianDate(item.work_end_date)}
            </Typography>
          </div>
        </div>


        <div className="flex justify-between w-full">
          {/* Reason */}
          {cleanReason && (
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Reason</Typography>

              <Typography variant="mobileCardValue">
                {truncateByChars(cleanReason, 60)}
              </Typography>
            </div>
          )}
          <MobileAllocatedTo
            users={item?.allocated_to}
            roles={item?.allocated_roles}
            align="right"
            RoleAssignedUsers={item?.role_assigned_users}
          />
        </div>
        {/* Pay Button */}

        <MyApprovalActionPill
          uiPermission={{
            app: "Leaves and Holidays",
            page: "Compensatory",
            actionKeysMap: {
              pay: "pay"
            }
          }}
          variant="buttons"
          canPay={item?.pay_button_required}
          onPay={handlePay}
          payLoading={isPending}
        />
      </div>
    </div>
  );
};

export default CompensatoryRequestCard;
