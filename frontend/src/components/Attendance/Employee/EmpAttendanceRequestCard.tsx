import { format, isValid } from "date-fns";
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

const EmpAttendanceRequestCard = ({
  data,
  type,
  columns = 7,
}: {
  data: MyAttendanceRequest;
  columns?: number;
  type: "actioned" | "pending";
}) => {
  console.log("data in emp card", data, type);
  const revokeEventMutation = useRevokeEvent();
  const { setRefetchAttendance } = useGlobalStore();
  const [edit, setEdit] = useState(false);
  const { isDesktop } = useScreenSize();
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
            setTimeout(() => {
              setRefetchAttendance(true);
            }, 2000);
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
    } else {
      return {
        statusColor: "bg-red-100 text-red-800",
        label: "Rejected",
      };
    }
  };

  const status = getStatus(data?.reference_document?.custom_status);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isValid(date) ? format(date, "dd/MM/yyyy") : "N/A";
  };

  const formattedFromDate = formatDate(data?.reference_document?.from_date);
  const formattedToDate = formatDate(data?.reference_document?.to_date);
  const formattedDueDate = formatDate(data?.due_date);
  return (
    <>
      {isDesktop ? (
        <div
          className={`grid grid-cols-${columns} items-center gap-4 px-6 h-14 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer`}
        >
          <div className="text-sm font-medium text-gray-700 text-start truncate">
            {data?.username}
          </div>
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
          {/* To Date */}
          <div className="text-sm text-gray-900 text-start">
            {formattedDueDate}
          </div>

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
                variant="contain"
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
        <div className="w-full px-2 flex border border-gray-200 items-center justify-between bg-white rounded-xl cursor-pointer hover:shadow-md transition-shadow">
          <div className=" flex items-start justify-between gap-4 w-full">
            <div className="flex gap-1 flex-col justify-around w-full">
              <div className="flex items-center gap-2">
                <p className="whitespace-nowrap">
                  {" "}
                  {data?.reference_document?.custom_request_type}
                </p>
                <div className="p-2 w-full ">
                  <Badge
                    size="sm"
                    backgroundColor={status?.statusColor}
                    label={status?.label || ""}
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
                {/* <div className="text-sm text-gray-600">{data?.reason}</div> */}
              </div>
              <div className="text-sm text-gray-500">
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
            defaultAttendanceData={data?.reference_document}
            forActionType="edit"
          />,
          document.body
        )}
    </>
  );
};

export default EmpAttendanceRequestCard;
