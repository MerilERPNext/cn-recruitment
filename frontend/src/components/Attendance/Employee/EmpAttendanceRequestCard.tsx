import { MyAttendanceRequest } from "../../../types/attendance";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { RotateCcw } from "lucide-react";
import Tooltip from "../../shared/Tooltip";
import { useRevokeEvent } from "../../../hooks/userApprovalList";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import Button from "../../shared/atoms/Button";
import { useState } from "react";
import { createPortal } from "react-dom";
import AttendanceRequestFormV2 from "../AttendanceRequest/AttendanceRequestFormV2";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { Link } from "react-router-dom";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import toast from "react-hot-toast";
import { differenceInCalendarDays, parse, startOfDay } from "date-fns";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import { truncateByChars } from "../../../utils/sanitizeToPlainText";
import StatusBadge from "../../shared/atoms/statusBadge";

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
  const duration = getDays(formattedToDate, formattedFromDate);
  const gridTemplateColumns = "1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr";

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

          <Link
            to={`/webapp/employee-profile?target_user=${data?.allocated_to_emp_id}`}
            target="_blank"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              {" "}
              <WrapperHoverCard employeeId={data?.allocated_to_emp_id}>
                {data?.username}
              </WrapperHoverCard>
            </Typography>
          </Link>
          {/* Status */}
          <div className="flex items-center justify-center">
            <Tooltip
              content={
                data?.reference_document?.custom_status === "Pending"
                  ? `Allocated to : ${data?.allocated_to}`
                  : ""
              }
            >
              <StatusBadge status={data?.reference_document?.custom_status} />
            </Tooltip>
          </div>
          <div className="flex items-center justify-center">
            <MyApprovalActionPill
              isPending={type === "pending"}
              canRevoke={!!data?.custom_allow_revoke}
              canEdit={!!data?.can_edit}
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
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Allocated To</Typography>
                <Typography variant="mobileCardValue" className="font-semibold">
                  {data?.username || data?.allocated_to}
                </Typography>
              </div>

              <StatusBadge status={data?.reference_document?.custom_status} />
            </div>

            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Request Type</Typography>
                <Typography variant="mobileCardValue" className="font-semibold">
                  {data?.reference_document?.custom_request_type}
                </Typography>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">Leave Days</Typography>
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
                  {formatToIndianDate(formattedFromDate)} to{" "}
                  {formatToIndianDate(formattedToDate)}
                </Typography>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">Due Date</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(formattedDueDate)}
                </Typography>
              </div>
            </div>

            {/* Actions */}
            {(data?.custom_allow_revoke && type === "pending") ||
            (type === "pending" && data?.can_edit) ? (
              <div className="flex gap-2 mt-2">
                {type === "pending" && data?.can_edit && (
                  <Button
                    fullWidth
                    variant="contain"
                    onClick={() => setEdit(true)}
                  >
                    Edit
                  </Button>
                )}

                {data?.custom_allow_revoke && type === "pending" && (
                  <Button
                    fullWidth
                    variant="contain"
                    onClick={handleRevokeClick}
                    disabled={revokeEventMutation.isPending}
                    icon={<RotateCcw className="w-4 h-4" />}
                  >
                    {revokeEventMutation.isPending ? "Revoking..." : "Revoke"}
                  </Button>
                )}
              </div>
            ) : null}
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
