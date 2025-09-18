import { format } from "date-fns";
import { MyAttendanceRequest } from "../../../types/attendance";
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Edit2 } from "lucide-react";
import Tooltip from "../../shared/Tooltip";
import { useRevokeEvent } from "../../../hooks/userApprovalList";

const EmpAttendanceRequestCard = ({ data }: { data: MyAttendanceRequest }) => {
  const { isDesktop } = useScreenSize();
  const revokeEventMutation = useRevokeEvent();

  const handleRevokeClick = () => {
    if (data?.todo_id) {
      revokeEventMutation.mutate({
        docname: data?.reference_name,
        todo: data?.todo_id,
      });
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
        label: "Rejected",
        statusColor: "bg-red-100 text-red-800",
      };
    }
  };
  const status = getStatus(data?.reference_document?.custom_status);
  const formattedFromDate = data?.reference_document?.from_date
    ? format(new Date(data?.reference_document.from_date), "dd/MM/yyyy")
    : "N/A";
  const formattedToDate = data?.reference_document?.to_date
    ? format(new Date(data?.reference_document?.to_date), "dd/MM/yyyy")
    : "N/A";
  return (
    <>
      {isDesktop ? (
        <div className="grid grid-cols-5 items-center gap-4 px-6 h-14 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
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

          {/* Status */}
          <div className="flex justify-start">
            <Tooltip content={status?.label === "Pending" ? "Test" : ""}>
              <Badge
                backgroundColor={status?.statusColor}
                label={status?.label || ""}
              />
            </Tooltip>
          </div>
          <div className="text-sm text-gray-900 text-start flex gap-2">
            {data?.custom_allow_revoke ? (
              <button
                onClick={handleRevokeClick}
                disabled={revokeEventMutation.isPending}
                className="w-fit bg-black text-white text-xs py-1 px-2 rounded-lg disabled:opacity-50"
              >
                {revokeEventMutation.isPending ? "Revoking..." : "Revoke"}
              </button>
            ) : (
              <></>
            )}
            <Edit2 className="h-5 w-5" />
          </div>
        </div>
      ) : (
        <div className="w-full flex border border-gray-100 items-center justify-between gap-3 bg-white shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-shadow">
          <div className="px-4 py-2 w-full">
            <div className=" flex items-start justify-between gap-1">
              <div>
                <div className="flex gap-2">
                  {data?.reference_document?.custom_request_type}
                  <Badge
                    backgroundColor={status?.statusColor}
                    label={status?.label || ""}
                  />
                </div>
                <div className="font-medium text-gray-900">
                  {data?.reference_document?.from_date
                    ? format(
                        new Date(data?.reference_document?.from_date),
                        "dd/MM/yyyy"
                      )
                    : "N/A"}
                  {data?.reference_document?.to_date
                    ? ` - ${format(
                        new Date(data?.reference_document?.to_date),
                        "dd/MM/yyyy"
                      )}`
                    : "N/A"}
                </div>
                {/* <div className="text-sm text-gray-600">{data?.reason}</div> */}
              </div>
              <div className="text-sm text-gray-900 text-start flex gap-2 mt-2">
                {data?.custom_allow_revoke ? (
                  <button
                    onClick={handleRevokeClick}
                    disabled={revokeEventMutation.isPending}
                    className="w-fit bg-black text-white text-xs py-1 px-2 rounded-lg disabled:opacity-50"
                  >
                    {revokeEventMutation.isPending ? "Revoking..." : "Revoke"}
                  </button>
                ) : (
                  <></>
                )}
                <Edit2 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmpAttendanceRequestCard;
