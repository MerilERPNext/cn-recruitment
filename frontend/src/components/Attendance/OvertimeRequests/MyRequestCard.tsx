import { MyPlannedAttendanceRequest } from "../../../types/attendance";
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import Tooltip from "../../shared/Tooltip";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { Typography } from "../../shared/atoms/Typography";
import { Link } from "react-router-dom";
import {
  sanitizeToPlainText,
  truncateByChars,
} from "../../../utils/sanitizeToPlainText";
import StatusBadge from "../../shared/atoms/statusBadge";

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

  const cleanDescription = sanitizeToPlainText(request?.description);
  const truncatedDescription = truncateByChars(cleanDescription);

  const gridTemplateColumns = "1.5fr 1fr 1fr 1fr 1fr";
  return (
    <>
      {isDesktop ? (
        <div
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(request)}
        >
          <Tooltip content={cleanDescription}>
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              {truncatedDescription}
            </Typography>
          </Tooltip>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(request?.reference_document?.creation)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(request?.due_date)}
          </Typography>
          <Link
            to={`/webapp/employee-profile?target_user=${request?.allocated_to_emp_id}`}
            target="_blank"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              <WrapperHoverCard employeeId={request?.allocated_to_emp_id}>
                {request?.username}
              </WrapperHoverCard>
            </Typography>
          </Link>
          <div className="flex items-center justify-center">
            <Tooltip
              content={
                status?.label === "Pending"
                  ? `Allocated to : ${request?.allocated_to}`
                  : ""
              }
            >
              {/* <Badge
                size="md"
                label={status?.label as string}
                backgroundColor={status?.statusColor}
              /> */}
              <StatusBadge status={request?.status} />

            </Tooltip>
          </div>
        </div>
      ) : (
        <div
          className="block cursor-pointer border border-gray-200 gap-3 bg-white shadow-sm transition-shadow rounded-xl"
          onClick={() => onClick?.(request)}
        >
          <div className="p-4">
            <div className="flex items-start gap-3 w-full">
              <div className="w-full">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <Link
                      to={`/webapp/employee-profile?target_user=${request?.allocated_to_emp_id}`}
                      target="_blank"
                    >
                      <h3 className="card-title">{request?.username}</h3>
                    </Link>
                    {/* <p className="text-sm text-gray-500">{request?.todo_id}</p> */}
                    <p className="card-subtitle">
                      {formatToIndianDate(request?.due_date)}
                    </p>
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
