import { format, isValid, parse } from "date-fns";
import { RequestCardProps } from "../../../types/attendance";
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import DOMPurify from "dompurify";

export function RequestCard({
  request,
  onClick,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
any & {
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onClick?: (request: RequestCardProps["request"]) => void;
}) {
  const { isDesktop } = useScreenSize();
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
    return {
      label: status || "Unknown",
      statusColor: "bg-gray-100 text-gray-600",
    };
  };

  const formatDate = (date: string): string => {
    if (!date) return "--/--/----";

    const possibleFormats = ["dd-MM-yyyy", "yyyy-MM-dd"];

    for (const dateFormat of possibleFormats) {
      const parsedDate = parse(date, dateFormat, new Date());
      if (isValid(parsedDate)) {
        return format(parsedDate, "dd/MM/yyyy");
      }
    }

    return "--/--/----";
  };
  const status = getStatus(request?.status);

  const gridTemplateColumns = "16% 20% 10% 10% 10% 20%";
  const cleanExplaination = DOMPurify.sanitize(
    request?.reference_document?.explanation || ""
  );
  return (
    <>
      {isDesktop ? (
        <div
          className="grid grid-cols-4 gap-4 items-center px-6 h-14 hover:bg-gray-50 transition-colors text-center cursor-pointer border-b"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(request)}
        >
          <div className="truncate text-gray-900 font-medium text-sm text-start">
            {request?.reference_document?.employee_name}
          </div>
          <div className="truncate text-gray-900 font-medium text-sm text-start">
            {cleanExplaination}
          </div>

          {/* Date */}
          <div className="text-gray-700 text-sm text-start">
            {formatDate(request?.reference_document?.from_date)}
          </div>
          <div className="text-gray-700 text-sm text-start">
            {formatDate(request?.reference_document?.to_date)}
          </div>
          <div className="text-gray-700 text-sm text-start">
            {formatDate(request?.due_date)}
          </div>
          <div className="w-full flex justify-start">
            <Badge
              size="sm"
              label={status?.label as string}
              backgroundColor={status?.statusColor}
            />
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
                  <div>
                    <p className="text-md font-bold">
                      {request?.reference_document?.employee_name}
                    </p>
                    <p className="text-sm text-gray-500">{request?.todo_id}</p>
                  </div>
                  <Badge
                    size="sm"
                    label={status?.label as string}
                    backgroundColor={status?.statusColor}
                  />
                </div>

                <div className="flex justify-between w-full ">
                  {/* Display From Date */}
                  {request?.reference_document?.from_date && (
                    <p className="text-sm text-gray-500 flex flex-col justify-center items-start">
                      <span>From</span>
                      <span className="text-black font-semibold">
                        {formatDate(request?.reference_document?.from_date)}
                      </span>
                    </p>
                  )}

                  {/* Display To Date */}
                  {request?.reference_document?.to_date && (
                    <p className="text-sm text-gray-500 flex flex-col items-center">
                      <span>To</span>
                      <span className="text-black font-semibold">
                        {formatDate(request?.reference_document?.to_date)}
                      </span>
                    </p>
                  )}
                  {request?.due_date && (
                    <p className="text-sm text-gray-500 flex flex-col items-end">
                      <span>Due</span>
                      <span className="text-black font-semibold">
                        {formatDate(request?.due_date)}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
