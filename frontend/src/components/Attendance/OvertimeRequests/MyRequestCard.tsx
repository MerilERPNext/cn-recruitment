import { useState } from "react";
import { MyPlannedAttendanceRequest } from "../../../types/attendance";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import Tooltip from "../../shared/Tooltip";
import { Typography } from "../../shared/atoms/Typography";
import {
  sanitizeToPlainText,
  truncateByChars,
} from "../../../utils/sanitizeToPlainText";
import StatusBadge from "../../shared/atoms/statusBadge";
import Button from "../../shared/atoms/Button";
import { Edit, RotateCcw } from "lucide-react";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import { useRevokeEvent } from "../../../hooks/userApprovalList";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import { useLoadingOverlay } from "../../../context/OverlayContext";

export function MyRequestCard({
  request,
  onClick,
  onEdit,
  onActionComplete,
}: {
  request: MyPlannedAttendanceRequest;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onClick?: (request: MyPlannedAttendanceRequest) => void;
  onEdit?: (request: MyPlannedAttendanceRequest) => void;
  onActionComplete?: () => void;
}) {
  const { isDesktop } = useScreenSize();
  const [isActed, setIsActed] = useState(false);

  const cleanDescription = sanitizeToPlainText(request?.description);
  const truncatedDescription = truncateByChars(cleanDescription);
  const { data: userUiPermission } = useGetUiPermission("Attendance");
  const canEditOvertimeRequest = isActionEnabled(
    userUiPermission,
    "edit_overtime_request",
    "Planned Overtime",
  );
  const canRevokeOvertimeRequest = isActionEnabled(
    userUiPermission,
    "can_revoke_overtime",
    "Planned Overtime",
  );
  // Only allow editing if status is "Open"
  const canEdit = request?.status === "Open" && request?.can_edit;
  const canRevoke = request?.status === "Open" && request?.custom_allow_revoke;
  const gridTemplateColumns = "1.5fr 1fr 1fr 1fr 0.5fr";
  const revokeEventMutation = useRevokeEvent();
  const loading = useLoadingOverlay();

  const handleRevokeClick = () => {
    if (request?.todo_id) {
      revokeEventMutation.mutate(
        {
          docname: request?.reference_name,
          doctype: request?.reference_type,
          todo: request?.todo_id,
        },
        {
          onSuccess: () => {
            setIsActed(true);
            toast.success("Attendance Request Revoked Successfully!");
            // Trigger refetch in parent component
            setTimeout(() => {
              if (onActionComplete) {
                onActionComplete();
              }
            }, 2000);
          },
          onError: (error) => {
            const formatedError = errorResponseFormater(error);
            toast.error(formatedError);
          },
          onSettled: () => {
            loading?.hide();
          },
        },
      );
    }
  };

  return (
    <>
      {isDesktop ? (
        <div
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(request)}
        >
          <Tooltip content={cleanDescription}>
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              {truncatedDescription}
            </Typography>
          </Tooltip>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(request?.reference_document?.creation)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(request?.due_date)}
          </Typography>

          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={request?.allocated_to}
              roles={request?.allocated_roles}
              allocated_to_user={request?.username}
              RoleAssignedUsers={request?.role_assigned_users || []}
              position="left"
            >
              <StatusBadge status={request?.status} />
            </AllocatedToTooltip>
          </div>
          <div className={`flex items-center justify-center ${isActed ? "pointer-events-none opacity-50" : ""}`}>
            {canEditOvertimeRequest && <Button
              size="sm"
              variant="subtle"
              disabled={!canEdit || isActed}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (canEdit && onEdit) {
                  onEdit(request);
                }
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>}
            {canRevokeOvertimeRequest && <Button size="sm" variant="subtle"
              disabled={!canRevoke || isActed}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRevokeClick();
              }}>
              <RotateCcw className="w-4 h-4" />
            </Button>}
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x-1 border-b-1 
               border-x-primary/20 border-b-primary/20 
               shadow-sm border-primary bg-white rounded-xl"
          onClick={() => onClick?.(request)}
        >
          <div className="p-4 flex items-start gap-3 w-full">
            <div className="w-full">
              {/* Header */}
              <div className="flex items-start justify-between p-1">
                <MobileAllocatedTo
                  users={request?.allocated_to}
                  roles={request?.allocated_roles}
                  username={request?.username}
                RoleAssignedUsers={request?.role_assigned_users}
              />

                <StatusBadge status={request?.status} />
              </div>

              {/* Content */}
              <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-2">
                    <Typography variant="mobileCardLabel">
                      Created On
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {formatToIndianDate(
                        request?.reference_document?.creation,
                      )}
                    </Typography>
                  </div>

                  <div className="flex flex-col gap-2 text-right">
                    <Typography variant="mobileCardLabel">Due Date</Typography>
                    <Typography variant="mobileCardValue">
                      {request?.due_date as string}
                    </Typography>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Typography variant="mobileCardLabel">Description</Typography>
                  <Typography variant="mobileCardValue">
                    {truncateByChars(cleanDescription, 40)}
                  </Typography>
                </div>
                <div className={`flex items-center justify-center ${isActed ? "pointer-events-none opacity-50" : ""}`}>
                  {canEditOvertimeRequest && <Button
                    size="sm"
                    variant="soft"
                    disabled={!canEdit || isActed}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (canEdit && onEdit) {
                        onEdit(request);
                      }
                    }}
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </Button>}
                  {canRevokeOvertimeRequest && <Button size="sm" variant="soft"
                    disabled={!canRevoke || isActed}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRevokeClick();
                    }}>
                    <RotateCcw className="w-4 h-4" /> Revoke
                  </Button>}
                  {
                    !canRevokeOvertimeRequest && !canEditOvertimeRequest && <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-10 text-gray-600 text-xs font-medium w-fit">
                      No Available Action
                    </div>
                  }

                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
