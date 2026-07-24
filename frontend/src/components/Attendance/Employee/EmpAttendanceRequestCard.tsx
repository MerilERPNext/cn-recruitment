import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useRevokeEvent } from "../../../hooks/userApprovalList";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { MyAttendanceRequest } from "../../../types/attendance";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { truncateByChars } from "../../../utils/sanitizeToPlainText";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";
import StatusBadge from "../../shared/atoms/statusBadge";
import { Typography } from "../../shared/atoms/Typography";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";

import Tooltip from "../../shared/Tooltip";
import AttendanceRequestFormV2 from "../AttendanceRequest/AttendanceRequestFormV2";
import { getAssignedUsersCell } from "../../../utils/getAssignedUsersCell";
import { useQueryClient } from "@tanstack/react-query";

const EmpAttendanceRequestCard = ({
  data,
  type,
}: {
  data: MyAttendanceRequest;
  type: "actioned" | "pending";
}) => {
  const revokeEventMutation = useRevokeEvent();
  const { setRefetchAttendance } = useGlobalStore();
  const [edit, setEdit] = useState(false);
  const [isActed, setIsActed] = useState(false);
  const { isDesktop } = useScreenSize();
  const loading = useLoadingOverlay();
  const queryClient = useQueryClient();

  const handleRevokeClick = () => {
    if (data?.todo_id) {
      loading?.show("Revoking Request...");
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
            }, 2000);
            toast.success("Attendance Request Revoked Successfully!");
            queryClient.invalidateQueries({ queryKey: ["attendance", "all"] });
            queryClient.invalidateQueries({ queryKey: ["employee-attendance-summary"] });
            queryClient.invalidateQueries({ queryKey: ["get-All-Events-And-Attendance"] });
            queryClient.invalidateQueries({ queryKey: ["attendance-calendar-details"] });
            queryClient.invalidateQueries({ queryKey: ["attendance-requests"] });
            queryClient.invalidateQueries({ queryKey: ["leave-buttons-status"] });
            queryClient.invalidateQueries({ queryKey: ["employee-attendance-details"] });
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

  function getDays(from_date: string, to_date: string): number {
    if (!from_date || !to_date) return 0;
    const fromDate = startOfDay(parseISO(from_date));
    const toDate = startOfDay(parseISO(to_date));
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return 0;
    return differenceInCalendarDays(toDate, fromDate) + 1; // inclusive
  }

  const formattedFromDate = formatToIndianDate(
    data?.reference_document?.from_date,
  );
  const formattedToDate = formatToIndianDate(data?.reference_document?.to_date);
  const formattedDueDate = formatToIndianDate(data?.due_date);
  const formattedCreationDate = formatToIndianDate(data?.reference_document?.creation);

  const duration = getDays(
    data?.reference_document?.from_date ?? "",
    data?.reference_document?.to_date ?? "",
  );
  const gridTemplateColumns = "1.5fr 1fr 1fr 1fr 1fr 0.8fr 1fr 1fr 1fr 1fr";

  const status = data?.custom_allow_revoke && data?.reference_document?.docstatus === 2 && data?.todo_status.toLowerCase() === "cancelled" ? "Revoked" : data?.reference_document?.custom_status;
  const isPendingStatus = ["pending", "open"].includes(status?.toLowerCase());

  return (
    <>
      {isDesktop ? (
        <div
          className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
          style={{ gridTemplateColumns }}
        >
          {/* Request Type */}
          <Tooltip content={data?.reference_document?.custom_request_type}>
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              {truncateByChars(data?.reference_document?.custom_request_type)}
            </Typography>
          </Tooltip>

          <div className="flex items-center justify-center">
            {getAssignedUsersCell(data)}
          </div>
          {/* From Date */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {formattedFromDate}
          </Typography>

          {/* To Date */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {formattedToDate}
          </Typography>
          {/* Due Date */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {formattedDueDate}
          </Typography>
          {/* Creation   */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {formattedCreationDate}
          </Typography>
          {/* Duration */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {duration > 1 ? duration + " Days" : duration + " Day"}
          </Typography>


          {/* Status */}
          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={data?.allocated_to}
              roles={data?.allocated_roles}
              allocated_to_user={data?.username}
              RoleAssignedUsers={data?.role_assigned_users || []}
              position="left"
            >
              <StatusBadge status={status} />

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
                page: "My Attendance",
                actionKeysMap: {
                  edit: "edit",
                  revoke: "revoke",
                  nudge: "nudge",
                }
              }}

              isPendingStatus={isPendingStatus}
              todoId={data?.todo_id}
              canRevoke={!!data?.custom_allow_revoke && data?.reference_document?.custom_status === "Pending" && !isActed}
              canEdit={!!data?.can_edit && !isActed}
              revokeLoading={revokeEventMutation.isPending}
              onRevoke={handleRevokeClick}
              onEdit={() => setEdit(true)}
            />
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x border-b 
      border-x-primary/20 border-b-primary/20 
      shadow-sm border-primary bg-white rounded-xl"
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

              <StatusBadge status={status} />
            </div>

            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Request Type</Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.custom_request_type}
                </Typography>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">Days</Typography>
                <Typography variant="mobileCardValue">
                  {duration > 1 ? duration + " Days" : duration + " Day"}
                </Typography>
              </div>
            </div>

            {/* Dates Section */}
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Duration</Typography>
                <Typography variant="mobileCardValue">
                  {formattedFromDate} to {formattedToDate}
                </Typography>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">Due Date</Typography>
                <Typography variant="mobileCardValue">
                  {formattedDueDate}
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
                  page: "My Attendance",
                  actionKeysMap: {
                    edit: "edit",
                    revoke: "revoke",
                    nudge: "nudge",
                  }
                }}

                isPendingStatus={isPendingStatus}
                todoId={data?.todo_id}
                variant="buttons"
                canRevoke={type === "pending" && !!data?.custom_allow_revoke && data?.reference_document?.custom_status === "Pending" && !isActed}
                canEdit={type === "pending" && !!data?.can_edit && !isActed}
                revokeLoading={revokeEventMutation.isPending}
                onRevoke={handleRevokeClick}
                onEdit={() => setEdit(true)}
              />
            </div>
          </div>
        </div>
      )}
      {edit &&
        createPortal(
          <AttendanceRequestFormV2
            onClose={() => setEdit(false)}
            defaultAttendanceData={data}
            forActionType="edit"
          />,
          document.body,
        )}
    </>
  );
};

export default EmpAttendanceRequestCard;
