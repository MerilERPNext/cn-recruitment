import { format, parse } from "date-fns";
import { RequestCardProps } from "../../../types/attendance";
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import DOMPurify from "dompurify";

export function MyRequestCard({
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
    if (status === "Open") {
      return {
        label: "Open",
        statusColor: "bg-yellow-100 text-yellow-600",
      };
    } else if (status === "Pending") {
      return {
        label: "Pending",
        statusColor: "bg-orange-100 text-orange-600",
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

  const status = getStatus(request?.status);
  const formattedDate = request?.due_date
    ? format(parse(request?.due_date, "dd-MM-yyyy", new Date()), "dd/MM/yyyy")
    : "--/--/----";
  const cleanDescription = DOMPurify.sanitize(request?.description || "");
  const gridTemplateColumns = request?.username
    ? "15% 30% 10% 33%"
    : "42% 10% 33%";

  return (
    <>
      {isDesktop ? (
        <div
          className="grid grid-cols-4 gap-4 items-center px-6 h-14 hover:bg-gray-50 transition-colors text-center cursor-pointer border-b"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(request)}
        >
          {request?.username ? (
            <div className="truncate text-gray-900 font-medium text-sm text-start">
              {request?.username}
            </div>
          ) : null}
          <div className="text-gray-600 text-sm truncate text-start">
            <div dangerouslySetInnerHTML={{ __html: cleanDescription }} />
          </div>
          <div className="text-gray-700 text-sm text-start">
            {formattedDate}
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
                    <h3 className="font-semibold text-sm text-gray-800">
                      {request?.username}
                    </h3>
                    <p className="text-sm text-gray-500">{formattedDate}</p>
                  </div>
                  <Badge
                    size="sm"
                    label={status?.label as string}
                    backgroundColor={status?.statusColor}
                  />
                </div>

                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  <span className="font-semibold">Description:</span>{" "}
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
