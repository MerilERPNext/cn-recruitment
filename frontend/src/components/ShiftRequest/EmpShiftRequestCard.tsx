import { format } from "date-fns";
import Button from "../shared/atoms/Button";
import { RotateCcw, Pencil } from "lucide-react";
import Badge from "../shared/Badge";
import Tooltip from "../shared/Tooltip";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useRevokeEvent } from "../../hooks/userApprovalList";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { MyShiftRequest } from "../../types/shift";

const EmpShiftRequestCard = ({ data }: { data: MyShiftRequest }) => {
  const { isDesktop } = useScreenSize();
  const revokeEventMutation = useRevokeEvent();
  const { setRefetchAttendance } = useGlobalStore();

  const handleEditClick = () => {
    window.location.href = `/app/shift-request/${data.reference_name}`;
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
            setTimeout(() => {
              setRefetchAttendance(true);
            }, 1000);
          },
        }
      );
    }
  };

  const getStatus = (rawStatus: string) => {
    const status = rawStatus?.toLowerCase().trim();

    if (status === "draft") {
      return {
        label: "Draft",
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
        label: rawStatus || "Unknown",
        statusColor: "bg-gray-100 text-gray-800",
      };
    }
  };
  const status = getStatus(data?.reference_document?.status);
  const formattedFromDate = data?.reference_document?.from_date
    ? format(new Date(data?.reference_document.from_date), "dd/MM/yyyy")
    : "";
  const formattedToDate = data?.reference_document?.to_date
    ? format(new Date(data?.reference_document?.to_date), "dd/MM/yyyy")
    : "";
  return (
    <>
      {isDesktop ? (
        <div
          className={`grid grid-cols-5 items-center gap-4 px-6 h-14 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer`}
        >
          {/* Request Type */}
          <div className="text-sm font-medium text-gray-700 text-start truncate">
            {data?.reference_document?.shift_type}
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
            <Tooltip
              content={status?.label === "Draft" ? data?.allocated_to : ""}
            >
              <Badge
                size="sm"
                backgroundColor={status?.statusColor}
                label={status?.label || ""}
              />
            </Tooltip>
          </div>
          {data?.custom_allow_revoke &&
          data?.reference_document?.status === "Draft" ? (
            <div className="text-sm text-gray-900 text-start flex gap-5 items-center">
              {/* ✨ ADD THE EDIT BUTTON HERE */}
              <Button
                icon={<Pencil className="h-3 w-3" />}
                variant="outline"
                size="sm"
                onClick={handleEditClick}
              >
                Edit
              </Button>
              {/* REVOKE BUTTON */}
              <Button
                icon={<RotateCcw className="h-3 w-3" />}
                variant="contain"
                size="sm"
                onClick={handleRevokeClick}
                disabled={revokeEventMutation.isPending}
              >
                {revokeEventMutation.isPending ? "Revoking..." : "Revoke"}
              </Button>
            </div>
          ) : (
            <></>
          )}
        </div>
      ) : (
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 hover:shadow-md transition cursor-pointer">
          {/* Top Section: Shift Type + Status */}
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {data?.reference_document?.shift_type || "--"}
            </h3>
            <Badge
              size="sm"
              backgroundColor={status?.statusColor}
              label={status?.label || ""}
            />
          </div>

          {/* Two-column Info Layout */}
          <div className="flex justify-between gap-6">
            {/* Left Column */}
            <div>
              <div>
                <div className="text-xs text-gray-500">Employee</div>
                <div className="font-medium text-sm text-gray-800">
                  {data?.reference_document?.employee_name || "--"}
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xs text-gray-500">Shift Type</div>
                <div className="font-medium text-sm text-gray-800">
                  {data?.reference_document?.shift_type || "--"}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="text-right">
              <div>
                <div className="text-xs text-gray-500">From</div>
                <div className="font-medium text-sm text-gray-800">
                  {formattedFromDate}
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xs text-gray-500">To</div>
                <div className="font-medium text-sm text-gray-800">
                  {formattedToDate}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {data?.custom_allow_revoke &&
          data?.reference_document?.status === "Draft" ? (
            <div className="flex flex-wrap justify-start gap-2 mt-4">
              <Button
                icon={<Pencil className="h-3 w-3" />}
                variant="outline"
                size="sm"
                onClick={handleEditClick}
              >
                Edit
              </Button>
              <Button
                icon={<RotateCcw className="h-3 w-3" />}
                variant="contain"
                size="sm"
                onClick={handleRevokeClick}
                disabled={revokeEventMutation.isPending}
              >
                {revokeEventMutation.isPending ? "Revoking..." : "Revoke"}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
};

export default EmpShiftRequestCard;
