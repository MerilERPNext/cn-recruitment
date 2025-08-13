import { format } from "date-fns";
import { RequestCardProps } from "../../../types/attendance";
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
      className="cursor-pointer border border-gray-200 gap-3 bg-white shadow-sm transition-shadow rounded-xl"
      onClick={() => onClick?.(request)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3 w-full">
          {!isActionedCard && (
            <input
              type="checkbox"
              className="mt-1 accent-blue-500"
              checked={isSelected}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onChange={() => onToggleSelect?.(request?.name)}
            />
          )}
          <div className="w-full">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm text-gray-800">
                  {request?.employee_name}
                </h3>
                <p className="text-sm text-gray-500">
                  {format(new Date(request?.creation), "dd/MM/yyyy") || "--:--"}
                </p>
              </div>
              <Badge
                label={status?.label as string}
                backgroundColor={status?.statusColor}
              />
            </div>

            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              <span className="font-semibold">Reason:</span> {request.reason}
            </p>

            {!isActionedCard && (
              <div className="flex space-x-2 mt-3">
                <button
                  className="w-1/2 px-3 py-1.5 rounded-md bg-red-100 text-red-600 text-sm hover:bg-red-100 transition-colors border border-transparent hover:border-red-200"
                  // onClick={(e) => handleAction("rejected", e)}
                >
                  Reject
                </button>
                <button
                  className="w-1/2 px-3 py-1.5 rounded-md bg-green-100 text-green-600 text-sm hover:bg-green-100 transition-colors border border-transparent hover:border-green-200"
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
