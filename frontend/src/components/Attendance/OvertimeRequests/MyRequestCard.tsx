import { format, isValid, parse } from "date-fns";
import { MyPlannedAttendanceRequest } from "../../../types/attendance";
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import DOMPurify from "dompurify";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import Tooltip from "../../shared/Tooltip";
import WrapperHoverCard from "../../shared/WrapperHoverCard";

export function MyRequestCard({
  request,
  onClick,
}: {
  request: MyPlannedAttendanceRequest;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onClick?: (request: MyPlannedAttendanceRequest) => void;
}) {
  const { isDesktop } = useScreenSize();

  const getStatus = (status: string) => {
    switch (status) {
      case "Open":
        return {
          label: "Pending",
          statusColor: "bg-yellow-100 text-yellow-600",
        };

      case "Approved":
        return {
          label: "Approved",
          statusColor: "bg-green-100 text-green-600",
        };

      case "Rejected":
        return {
          label: "Rejected",
          statusColor: "bg-red-100 text-red-600",
        };

      default:
        return {
          label: status || "Unknown",
          statusColor: "bg-gray-100 text-gray-600",
        };
    }
  };

  const status = getStatus(request?.status);
  const parsedDate = request?.due_date
    ? parse(String(request.due_date), "dd-MM-yyyy", new Date())
    : null;

  const formattedDate =
    parsedDate && isValid(parsedDate)
      ? format(parsedDate, "dd/MM/yyyy")
      : "--/--/----";
  const cleanDescription = DOMPurify.sanitize(request?.description || "");
  const gridTemplateColumns = "2fr 1fr 1fr 1fr 1fr";
  return (
    <>
      {isDesktop ? (
        <div
          className="grid grid-cols-4 gap-4 items-center px-6 h-14 hover:bg-blue-50 transition-colors text-center cursor-pointer border-b"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(request)}
        >

          <div className="text-gray-600 text-sm truncate text-start">
            <div dangerouslySetInnerHTML={{ __html: cleanDescription }} />
          </div>
          <div className="text-gray-700 text-sm text-start">
            {formatToIndianDate(request?.reference_document?.creation) ||
              "--/--/--"}
          </div>
          <div className="text-gray-700 text-sm text-start">
            {formattedDate}
          </div>
            <div className="truncate text-gray-900 font-medium text-sm text-start">
          <WrapperHoverCard employeeId={request?.allocated_to_emp_id}>
              {request?.username || ""}
          </WrapperHoverCard>
            </div>
          <div className="w-full flex justify-start">
            <Tooltip content={`Allocated to : ${request?.allocated_to}`}>
              <Badge
                size="sm"
                label={status?.label as string}
                backgroundColor={status?.statusColor}
              />
            </Tooltip>
          </div>
        </div>
      ) : (
        <div
          className="block cursor-pointer border border-gray-200 gap-3 bg-white shadow-sm transition-shadow rounded-xl mx-2"
          onClick={() => onClick?.(request)}
        >
          <div className="p-4">
            <div className="flex items-start gap-3 w-full">
              <div className="w-full">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <h3 className="card-title">{request?.username}</h3>
                    {/* <p className="text-sm text-gray-500">{request?.todo_id}</p> */}
                    <p className="card-subtitle">{formattedDate}</p>
                  </div>
                  <Badge
                    size="sm"
                    label={status?.label as string}
                    backgroundColor={status?.statusColor}
                  />
                </div>

                <p className="card-subtitle mt-2 line-clamp-2">
                  <span className="card-title">Description:</span>{" "}
                  <div dangerouslySetInnerHTML={{ __html: cleanDescription }} />
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
