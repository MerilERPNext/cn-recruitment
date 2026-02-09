import { MyPlannedAttendanceRequest } from "../../../types/attendance";
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
              <StatusBadge status={request?.status} />
            </Tooltip>
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x-1 border-b-1 
               border-x-primary/20 border-b-primary/20 
               shadow-sm border-primary bg-white rounded-xl"
          onClick={() => onClick?.(request)}
        >
          <div className="p-4 flex items-start gap-3 w-full">
            <div className="w-full">
              {/* Header */}
              <div className="flex items-start justify-between p-1">
                <div className="flex flex-col gap-1">
                  <Typography
                    variant="mobileCardLabel"
                    className="text-gray-500"
                  >
                    Allocated To
                  </Typography>

                  <Typography
                    variant="mobileCardValue"
                    className="font-semibold text-gray-900"
                  >
                    {request?.username}
                  </Typography>
                </div>

                <StatusBadge status={request?.status} />
              </div>

              {/* Content */}
              <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-2">
                    <Typography variant="mobileCardLabel">
                      Created On
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {formatToIndianDate(
                        request?.reference_document?.creation,
                      )}
                    </Typography>
                  </div>

                  <div className="flex flex-col gap-2 text-right">
                    <Typography variant="mobileCardLabel">Due Date</Typography>
                    <Typography variant="mobileCardValue">
                      {request?.due_date as String}
                    </Typography>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Typography variant="mobileCardLabel">Description</Typography>
                  <Typography variant="mobileCardValue">
                    {truncateByChars(cleanDescription, 40)}
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
