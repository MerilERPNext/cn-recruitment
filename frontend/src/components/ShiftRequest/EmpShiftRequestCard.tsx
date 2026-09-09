import { useState } from "react";
import { createPortal } from "react-dom";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useShiftTypes } from "../../hooks/useShift";
import { useRevokeEvent } from "../../hooks/userApprovalList";
import { MyShiftRequest } from "../../types/shift";
import formatToIndianDate from "../../utils/formatToIndianDate";
import AllocatedToTooltip from "../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../shared/MobileAllocatedTo";
import MyApprovalActionPill from "../shared/atoms/MyApprovalActionPill";
import { Typography } from "../shared/atoms/Typography";
import StatusBadge from "../shared/atoms/statusBadge";
import ShiftRequestFormModal from "./ShiftRequestFormModal";
import { getAssignedUsersCell } from "../../utils/getAssignedUsersCell";
import Tooltip from "../shared/Tooltip";

interface EmpShiftRequestCardProps {
  data: MyShiftRequest;
}

const EmpShiftRequestCard = ({ data }: EmpShiftRequestCardProps) => {
  const { isDesktop } = useScreenSize();
  const revokeEventMutation = useRevokeEvent()
  const { setRefetchAttendance } = useGlobalStore();
  const formattedCreationDate = formatToIndianDate(data?.reference_document?.creation);
  const [edit, setEdit] = useState(false);
  const [isActed, setIsActed] = useState(false);
  const {
    data: shiftTypes,
    isLoading: shiftTypesLoading,
    error: shiftTypesError,
  } = useShiftTypes();

  const handleEditClick = () => {
    setEdit(true);
  };

  const handleRevokeClick = () => {
    if (data?.todo_id) {
      revokeEventMutation.mutate(
        {
          docname: data?.reference_name,
          doctype: data?.reference_type,
          todo: data?.todo_id,
        },
        {
          onSuccess: () => {
            setIsActed(true);
            setTimeout(() => {
              setRefetchAttendance(true);
            }, 1000);
          },
        },
      );
    }
  };

  const getShiftTimeline = (shiftTypeName: string) => {
    if (shiftTypes && !shiftTypesLoading && !shiftTypesError) {
      const shiftType = shiftTypes.data.find(
        (type) => type.name === shiftTypeName,
      );

      if (shiftType) {
        return `${shiftType.start_time || "--"} - ${shiftType.end_time || "--"
          }`;
      }
    }

    return "";
  };

  const gridTemplateColumns = "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr";
  const canEdit = Boolean(data?.can_edit && !isActed);
  const canRevoke = Boolean(
    data?.custom_allow_revoke &&
    data?.reference_document?.status === "Draft" &&
    !isActed,
  );
  const badgeStatus =
    data?.custom_allow_revoke &&
      data?.reference_document?.docstatus === 2 &&
      data?.reference_document?.status?.toLowerCase?.() === "cancelled"
      ? "Revoked"
      : data?.reference_document?.status;
  const isPendingStatus = ["pending", "open", "draft"].includes(badgeStatus?.toLowerCase());

  return (
    <>
      {isDesktop ? (
        <div
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
          style={{ gridTemplateColumns }}
        >
          {/* Request Type */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {data?.reference_document?.shift_name}
            <Typography variant="bodySmall" className="font-medium text-center">
              {getShiftTimeline(data?.reference_document?.shift_type || "")}
            </Typography>
          </Typography>
          {/* <div className="flex items-center justify-center">
            {getAssignedUsersCell(data)}
          </div> */}

          {/* From Date */}
          <Typography variant="bodySmall" className="font-medium text-center">

            {getAssignedUsersCell(data)}

          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.from_date || "")}
          </Typography>

          {/* To Date */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.to_date || "")}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formattedCreationDate}
          </Typography>


          {/* Status */}

          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={data?.allocated_to}
              RoleAssignedUsers={data?.role_assigned_users}
              roles={data?.allocated_roles}
              allocated_to_user={data?.username}
              position="left"
            >
              <StatusBadge status={badgeStatus} />
            </AllocatedToTooltip>
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
          <div className={`flex items-center justify-center ${isActed ? "pointer-events-none opacity-50" : ""}`}>
            <MyApprovalActionPill
              uiPermission={{
                app: "Attendance",
                page: "All Shifts",
                actionKeysMap: {
                  edit: "edit_shift_request",
                  revoke: "revoke_shift_request",
                  nudge: "nudge"
                }
              }}
              isPendingStatus={isPendingStatus}
              todoId={data?.todo_id}
              canEdit={canEdit}
              canRevoke={canRevoke}
              revokeLoading={revokeEventMutation.isPending}
              onEdit={handleEditClick}
              onRevoke={handleRevokeClick}
              requestItem={data}
            />
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x border-b 
      border-x-primary/20 border-b-primary/20 
      shadow-sm border-primary bg-white rounded-xl mb-4"
        >
          <div className="p-4 flex flex-col gap-4 w-full">
            {/* Header */}
            <div className="flex items-start justify-between">
              <MobileAllocatedTo
                users={data?.allocated_to}
                roles={data?.allocated_roles}
                username={data?.username}
                RoleAssignedUsers={data?.role_assigned_users}
              />

              <StatusBadge status={badgeStatus} />
            </div>

            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Shift Type</Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.shift_name || "--"}
                </Typography>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">Shift Time</Typography>
                <Typography variant="mobileCardValue">
                  {getShiftTimeline(data?.reference_document?.shift_type || "")}
                </Typography>
              </div>
            </div>

            {/* Dates */}
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">From</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(
                    data?.reference_document?.from_date || "",
                  )}
                </Typography>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">To</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.reference_document?.to_date || "")}
                </Typography>
              </div>
            </div>

            <div>
              <Typography variant="mobileCardLabel">Assigned To</Typography>
              <Typography variant="mobileCardValue">
                {getAssignedUsersCell(data)}
              </Typography>
            </div>
            <div>
              <Typography variant="mobileCardLabel">Sendback Comment</Typography>
              <Typography variant="mobileCardValue" className="text-gray-700">
                {data?.send_back_comment || "--"}
              </Typography>
            </div>
            {/* Actions */}
            <div className={isActed ? "pointer-events-none opacity-50" : ""}>
              <MyApprovalActionPill
                uiPermission={{
                  app: "Attendance",
                  page: "All Shifts",
                  actionKeysMap: {
                    edit: "edit_shift_request",
                    revoke: "revoke_shift_request",
                    nudge: "nudge"
                  }
                }}
                isPendingStatus={isPendingStatus}
                todoId={data?.todo_id}
                variant="buttons"
                canEdit={canEdit}
                canRevoke={canRevoke}
                revokeLoading={revokeEventMutation.isPending}
                onEdit={handleEditClick}
                onRevoke={handleRevokeClick}
                requestItem={data}
              />
            </div>
          </div>
        </div>
      )}
      {edit &&
        createPortal(
          <ShiftRequestFormModal
            onClose={() => setEdit(false)}
            defaultShiftRequestData={data?.reference_document}
            forActionType="edit"
            isOpen={edit}
          />,
          document.body,
        )}
    </>
  );
};

export default EmpShiftRequestCard;
