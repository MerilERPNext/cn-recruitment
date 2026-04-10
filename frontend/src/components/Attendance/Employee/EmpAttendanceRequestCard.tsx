import { differenceInCalendarDays, parse, startOfDay } from "date-fns";
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
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import Tooltip from "../../shared/Tooltip";
import AttendanceRequestFormV2 from "../AttendanceRequest/AttendanceRequestFormV2";

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

  function getDays(from_date: string, to_date: string) {
    const format = "dd-MM-yyyy";

    const fromDate = startOfDay(parse(from_date, format, new Date()));
    const toDate = startOfDay(parse(to_date, format, new Date()));


    const diff = differenceInCalendarDays(toDate, fromDate);

    return diff + 1; // inclusive
  }

  const formattedFromDate = formatToIndianDate(
    data?.reference_document?.from_date,
  );
  const formattedToDate = formatToIndianDate(data?.reference_document?.to_date);
  const formattedDueDate = formatToIndianDate(data?.due_date);
  const duration = getDays(formattedFromDate, formattedToDate);
  const gridTemplateColumns = "1.5fr 1fr 1fr 1fr 1fr 1fr 1fr";

  return (
    <>
      {isDesktop ? (
        <div
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
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
              position="left"
            >
              <StatusBadge status={data?.custom_allow_revoke && data?.reference_document?.docstatus === 2 && data?.todo_status.toLowerCase() === "cancelled" ? "Revoked" : data?.reference_document?.custom_status} />

            </AllocatedToTooltip>
          </div>
          <div className={`flex items-center justify-center ${isActed ? "pointer-events-none opacity-50" : ""}`}>
            <MyApprovalActionPill
              isPending={type === "pending"}
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
              />

              <StatusBadge status={data?.custom_allow_revoke && data?.reference_document?.docstatus === 2 && data?.todo_status.toLowerCase() === "cancelled" ? "Revoked" : data?.reference_document?.custom_status} />
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

            {/* Actions */}
            <div className={isActed ? "pointer-events-none opacity-50" : ""}>
              <MyApprovalActionPill
                variant="buttons"
                isPending={type === "pending"}
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
