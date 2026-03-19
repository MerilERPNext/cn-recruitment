import { MyPlannedAttendanceRequest } from "../../../types/attendance";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import Tooltip from "../../shared/Tooltip";
import { Typography } from "../../shared/atoms/Typography";
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

  const cleanDescription = sanitizeToPlainText(request?.description);
  const truncatedDescription = truncateByChars(cleanDescription);

  const gridTemplateColumns = "1.5fr 1fr 1fr 1fr";
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

          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={request?.status === "Open" ? request?.allocated_to : undefined}
              roles={request?.status === "Open" ? request?.allocated_roles : undefined}
              position="left"
            >
              <StatusBadge status={request?.status} />
            </AllocatedToTooltip>
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
                <MobileAllocatedTo
                  users={request?.username ? [request.username] : []}
                  roles={request?.allocated_roles}
                  username={request?.username}
                  allocated_to={request?.allocated_to}
                  hasPendingStatus={request?.status === "Open"}
                />

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
                      {request?.due_date as string}
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
