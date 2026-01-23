import { MyAttendanceRequest } from "../../../types/attendance";
import Badge from "../../shared/Badge";
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

const EmpAttendanceRequestCard = ({
  data,
  type,
  columns = 8,
}: {
  data: MyAttendanceRequest;
  columns?: number;
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
          }, onError: (error) => {
            const formatedError = errorResponseFormater(error);
            toast.error(formatedError);
          },
          onSettled: () => {
            loading?.hide();
          },
        }
      );
    }
  };

  const getStatus = (rawStatus: string) => {
    const status = rawStatus?.toLowerCase().trim();

    if (status === "pending") {
      return {
        label: "Pending",
        statusColor: "bg-yellow-100 text-yellow-800",
      };
    } else if (status === "approved") {
      return {
        label: "Approved",
        statusColor: "bg-green-100 text-green-800",
      };
    } else if (status === "rejected") {
      return {
        label: "Rejected",
        statusColor: "bg-red-100 text-red-800",
      };
    } else {
      return {
        statusColor: "bg-gray-100 text-gray-800",
        label: rawStatus || "Unknown",
      };
    }
  };

  const status = getStatus(data?.reference_document?.custom_status);
  function getDays(from_date: string, to_date: string) {
    const format = 'dd-MM-yyyy';

    const fromDate = startOfDay(parse(from_date, format, new Date()));
    const toDate = startOfDay(parse(to_date, format, new Date()));

    const diff = differenceInCalendarDays(toDate, fromDate);

    return diff + 1; // inclusive
  }

  const formattedFromDate = formatToIndianDate(data?.reference_document?.from_date);
  const formattedToDate = formatToIndianDate(data?.reference_document?.to_date);
  const formattedDueDate = formatToIndianDate(data?.due_date);
  const duration = getDays(formattedToDate, formattedFromDate);
  return (
    <>
      {isDesktop ? (
        <div
          className={`grid grid-cols-${columns} items-center gap-4 px-6 h-14 border-b border-gray-50 transition-colors cursor-pointer`}
        >

          {/* Request Type */}
          <div className="text-sm font-medium text-gray-700 text-start truncate">
            {data?.reference_document?.custom_request_type}
          </div>

          {/* From Date */}
          <div className="text-sm text-gray-900 text-start">
            {formattedFromDate}
          </div>

          {/* To Date */}
          <div className="text-sm text-gray-900 text-start">
            {formattedToDate}
          </div>
          {/* Duration */}
          <div className="text-sm text-gray-900 text-start">
            {duration > 1 ? duration + " Days" : duration + " Day"}
          </div>
          {/* Due Date */}
          <div className="text-sm text-gray-900 text-start">
            {formattedDueDate}
          </div>
          <WrapperHoverCard employeeId={data?.allocated_to_emp_id}>
            <Link to={`/webapp/employee-profile?target_user=${data?.allocated_to_emp_id}`} target="_blank">
              <div className="text-sm font-medium text-gray-700 text-start truncate">
                {data?.username}
              </div>
            </Link>
          </WrapperHoverCard>
          {/* Status */}
          <div className="flex justify-start">
            <Tooltip
              content={status?.label === "Pending" ? data?.allocated_to : ""}
            >
              <Badge
                size="sm"
                backgroundColor={status?.statusColor}
                label={status?.label || ""}
              />
            </Tooltip>
          </div>
          <div className="text-sm text-gray-900 text-start flex gap-2 items-center">
            {data?.custom_allow_revoke && type === "pending" ? (
              <Button
                icon={<RotateCcw className="h-3 w-3" />}
                variant="soft"
                size="sm"
                onClick={handleRevokeClick}
                disabled={revokeEventMutation.isPending}
              >
                {revokeEventMutation.isPending ? "Revoking..." : "Revoke"}
              </Button>
            ) : (
              <></>
            )}
            {type == "pending" && data?.can_edit && (
              <Button
                onClick={() => {
                  setEdit(true);
                }}
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full px-1 flex border border-gray-200 items-center justify-between bg-white rounded-xl cursor-pointer hover-lift transition-shadow">
          <div className=" flex items-start justify-between gap-4 w-full">
            <div className="flex gap-1 flex-col justify-around w-full p-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-between w-full py-1">
                  <div className="flex items-center gap-2">
                    <p className="whitespace-nowrap card-title">
                      {data?.reference_document?.custom_request_type}
                    </p>
                    <Badge
                      size="sm"
                      backgroundColor={"bg-blue-100 text-blue-800"}
                      label={duration > 1 ? duration + " Days" : duration + " Day"}
                    />
                  </div>
                  <div className="text-sm text-gray-900 text-start flex gap-2">
                    {data?.custom_allow_revoke && type === "pending" ? (
                      <Button
                        icon={<RotateCcw className="h-3 w-3" />}
                        variant="contain"
                        size="sm"
                        onClick={handleRevokeClick}
                        disabled={revokeEventMutation.isPending}
                      >
                        {revokeEventMutation.isPending ? "Revoking..." : ""}
                      </Button>
                    ) : (
                      <></>
                    )}
                    {type == "pending" && data?.can_edit && (
                      <Button
                        onClick={() => {
                          setEdit(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
                <Badge
                  size="sm"
                  backgroundColor={status?.statusColor}
                  label={status?.label || ""}
                />
                {/* <div className="text-sm text-gray-600">{data?.reason}</div> */}
              </div>
              <div className="card-subtitle">
                {formattedFromDate}
                {data?.reference_document?.to_date && formattedToDate !== "N/A"
                  ? ` - ${formattedToDate}`
                  : ""}
              </div>
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
          document.body
        )}
    </>
  );
};

export default EmpAttendanceRequestCard;
