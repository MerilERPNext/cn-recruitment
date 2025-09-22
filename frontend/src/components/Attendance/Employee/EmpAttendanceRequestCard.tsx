import { format } from "date-fns";
import { MyAttendanceRequest } from "../../../types/attendance";
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Edit2, RotateCcw } from "lucide-react";
import Tooltip from "../../shared/Tooltip";
import { useRevokeEvent } from "../../../hooks/userApprovalList";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import Button from "../../shared/atoms/Button";

const EmpAttendanceRequestCard = ({ data }: { data: MyAttendanceRequest }) => {
  const { isDesktop } = useScreenSize();
  const revokeEventMutation = useRevokeEvent();
  const { setRefetchAttendance } = useGlobalStore();

  const handleRevokeClick = () => {
    if (data?.todo_id) {
      revokeEventMutation.mutate(
        {
          docname: data?.reference_name,
          todo: data?.todo_id,
        },
        {
          onSuccess: () => {
            setRefetchAttendance(true);
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
                size="sm"
                backgroundColor={status?.statusColor}
                label={status?.label || ""}
              />
            </Tooltip>
          </div>
          <div className="text-sm text-gray-900 text-start flex gap-2 items-center">
            <Button
              icon={<Edit2 className="h-3 w-3" />}
              variant="subtle"
              size="sm"
            >
              Edit
            </Button>
            {data?.custom_allow_revoke ? (
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
          </div>
        </div>
      ) : (
        <div className="w-full px-2 flex border border-gray-200 items-center justify-between bg-white rounded-xl cursor-pointer hover:shadow-md transition-shadow">
          <div className="p-2 w-full ">
            <div className=" flex items-start justify-between gap-4">
              <div className="flex gap-1 flex-col">
                <div className="flex gap-2">
                  {data?.reference_document?.custom_request_type}
                  <Badge
                    size="sm"
                    backgroundColor={status?.statusColor}
                    label={status?.label || ""}
                  />
                </div>
                <div className="text-sm text-gray-500">
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
              <div className="text-sm text-gray-900 text-start flex gap-2">
                <Button
                  icon={<Edit2 className="h-3 w-3" />}
                  variant="subtle"
                  size="sm"
                >
                  Edit
                </Button>{" "}
                {data?.custom_allow_revoke ? (
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
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmpAttendanceRequestCard;
