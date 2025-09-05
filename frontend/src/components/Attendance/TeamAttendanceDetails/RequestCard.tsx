import { format } from "date-fns";
import { RequestCardProps } from "../../../types/attendance";
import Badge from "../../shared/Badge";
export function RequestCard({
  request,
  onClick,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
any & {
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onClick?: (request: RequestCardProps["request"]) => void;
}) {
  const getStatus = (status: string) => {
    if (status === "Open") {
      return {
        label: "Open",
        statusColor: "bg-yellow-100 text-yellow-600",
      };
    } else if (status === "Closed") {
      return {
        label: "Closed",
        statusColor: "bg-green-100 text-green-600",
      };
    } else if (status === "Cancelled") {
      return {
        label: "Cancelled",
        statusColor: "bg-red-100 text-red-600",
      };
    }
  };

  const status = getStatus(request?.status);

  return (
    <div
      className="cursor-pointer border border-gray-200 gap-3 bg-white shadow-sm transition-shadow rounded-xl"
      onClick={() => onClick?.(request)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3 w-full">
          <div className="w-full">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm text-gray-800">
                  {request?.allocated_to}
                </h3>
                <p className="text-sm text-gray-500">
                  {format(new Date(request?.date), "dd/MM/yyyy") || "--:--"}
                </p>
              </div>
              <Badge
                label={status?.label as string}
                backgroundColor={status?.statusColor}
              />
            </div>

            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              <span className="font-semibold">Description:</span>{" "}
              {request.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
