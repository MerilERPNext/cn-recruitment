import { RequestCardProps } from "../../../types/attendance";
import { formatDateString } from "../../../utils/helperUtils";
import Avatar from "../../shared/Avatar";
import Badge from "../../shared/Badge";

export function RequestCard({
  request,
  isActionedCard = false,
  isSelected = false,
  onToggleSelect,
  onClick,
}: RequestCardProps & {
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onClick?: (request: RequestCardProps["request"]) => void;
}) {
  const getStatus = (status: string) => {
    if (status === "Pending") {
      return {
        label: "Pending",
        statusColor: "bg-yellow-100 text-yellow-600",
      };
    } else if (status === "Approved") {
      return {
        label: "Approved",
        statusColor: "bg-green-100 text-green-600",
      };
    } else if (status === "Rejected") {
      return {
        label: "Rejected",
        statusColor: "bg-red-100 text-red-600",
      };
    }
  };

  const status = getStatus(request?.custom_status);

  return (
    <div
      className="cursor-pointer border border-gray-100 gap-3 bg-white shadow-sm rounded-xl"
      onClick={() => onClick?.(request)}
    >
      <div className="p-4">
        <div className="flex justify-start items-start gap-2 w-full">
          {!isActionedCard && (
            <input
              type="checkbox"
              className="mt-2"
              checked={isSelected}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onChange={() => onToggleSelect?.(request?.name)}
            />
          )}{" "}
          <div className="w-full">
            <div className="flex items-start space-x-3">
              <Avatar name={request?.employee_name} />

              <div className="flex-1">
                <div className="flex items-center justify-between ">
                  <h3 className="font-semibold text-sm">
                    {request?.employee_name}
                  </h3>
                  <Badge
                    label={status?.label as string}
                    backgroundColor={status?.statusColor}
                  />
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  {formatDateString(request?.creation) || "--:--"}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 line-clamp-1">
              <span className="font-semibold">Reason:</span> {request.reason}
            </p>
            {!isActionedCard && (
              <div className="flex space-x-2 mt-2">
                <button
                  className="bg-red-100 p-2 w-1/2 text-red-700 rounded-md font-semibold"
                  // onClick={(e) => handleAction("rejected", e)}
                >
                  Reject
                </button>
                <button
                  className="bg-green-100 p-2 w-1/2 text-green-700 rounded-md font-semibold"
                  // onClick={(e) => handleAction("approved", e)}
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
