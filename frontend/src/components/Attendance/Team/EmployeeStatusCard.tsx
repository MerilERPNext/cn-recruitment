import { format } from "date-fns";
import { useState, useRef } from "react";
import { EmployeeStatusType } from "../../../types/attendance";
import Avatar from "../../shared/Avatar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Edit, EllipsisVertical } from "lucide-react";
import ContextualPopup from "../../shared/molecules/ContextualPopup";
import { EditAttendance } from "./EditAttendance";
import Badge from "../../shared/Badge";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { Typography } from "../../shared/atoms/Typography";
import Button from "../../shared/atoms/Button";
import { Link } from "react-router-dom";

export interface EmployeeStatusItem {
  reports_to: string | undefined;
  employee: string;
  employee_name: string;
  status: string;
  in_time: string | null;
  out_time: string | null;
  working_hours: number | null;
  shift?: string | null;
  name?: string;
}

const EmployeeStatusCard = ({
  data,
  onRefetchData,
}: {
  data: EmployeeStatusItem;
  onRefetchData?: (() => void) | null;
}) => {
  const { isDesktop } = useScreenSize();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [editAttendance, setEditAttendance] = useState(false);
  console.log("EmployeeStatusCard data", data);

  const desktopButtonRef = useRef<HTMLButtonElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);

  const getStatusIndicatorColor = (
    status:
      | "present"
      | "absent"
      | "on leave"
      | "half day"
      | "work from home"
      | "default",
  ): { indicatorBgColor: string; indicatorBorderColor?: string } => {
    if (isDesktop) {
      switch (status) {
        case "present":
          return { indicatorBgColor: "bg-green-400", indicatorBorderColor: "border-green-100" };
        case "absent":
          return { indicatorBgColor: "bg-red-400", indicatorBorderColor: "border-red-100" };
        case "on leave":
          return { indicatorBgColor: "bg-amber-400", indicatorBorderColor: "border-amber-100" };
        case "half day":
          return { indicatorBgColor: "bg-orange-400", indicatorBorderColor: "border-orange-100" };
        case "work from home":
          return { indicatorBgColor: "bg-purple-400", indicatorBorderColor: "border-purple-100" };
        default:
          return { indicatorBgColor: "bg-slate-300", indicatorBorderColor: "border-slate-100" };
      }
    } else {
      switch (status) {
        case "present":
          return { indicatorBgColor: "bg-green-500", indicatorBorderColor: "border-white" };
        case "absent":
          return { indicatorBgColor: "bg-red-500", indicatorBorderColor: "border-white" };
        case "on leave":
          return { indicatorBgColor: "bg-yellow-400", indicatorBorderColor: "border-white" };
        case "half day":
          return { indicatorBgColor: "bg-orange-400", indicatorBorderColor: "border-white" };
        case "work from home":
          return { indicatorBgColor: "bg-blue-400", indicatorBorderColor: "border-white" };
        default:
          return { indicatorBgColor: "bg-gray-300", indicatorBorderColor: "border-white" };
      }
    }
  };

  const statusColors = getStatusIndicatorColor(
    (data?.status?.toLowerCase() as EmployeeStatusType) || "default"
  );

  return (
    <div className="w-full mt-2 p-3 border shadow-sm rounded-xl bg-white  border-gray-100">
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        {/* Left Section */}
        <div className="flex items-start gap-3 flex-1 justify-center">
          <Avatar
            name={data?.employee_name}
            avatarBgColor={isDesktop ? "bg-white" : "bg-indigo-100"}
            avatarTextColor={isDesktop ? "text-gray-700" : "text-indigo-800"}
            {...statusColors}
          />

          <div className="flex-1 min-w-10">
            <div className="flex flex-wrap items-start gap-2">
              <Link
                to={`/webapp/employee-profile?target_user=${data?.employee}`}
                target="_blank"
              >
                <Typography
                  variant="bodyMedium"
                  className="font-semibold text-gray-800 truncate max-w-[150px] sm:max-w-none"
                >
                  <WrapperHoverCard employeeId={data?.employee}>
                    {data?.employee_name}
                  </WrapperHoverCard>
                </Typography>
              </WrapperHoverCard>
              </Link>
              {data?.shift ? (
                <Badge size="sm" label={"Shift " + data?.shift} />
              ) : null}
            </div>

            <Typography variant="bodySmall" color="body2" className="capitalize mt-1">
              {data?.status}
            </Typography>
          </div>

          {!isDesktop && (
            <Button
              ref={mobileButtonRef}
              variant="subtle"
              size="sm"
              onClick={() => setIsPopupOpen(!isPopupOpen)}
              className="self-center h-full px-2 text-gray-600 hover:text-gray-800"
            >
              <EllipsisVertical size={18} />
            </Button>
          )}
        </div>

        {/* Middle Section */}
        <div className="flex justify-center w-full max-w-[700px] gap-4">
          <div className="flex flex-wrap sm:flex-nowrap justify-between max-w-[700px] gap-4 sm:gap-6 mt-2 sm:mt-0 w-full py-1 px-4">
            <div className="text-center">
              <Typography
                variant="bodySmall"
                color="body2"
                className="font-medium"
              >
                Check-in
              </Typography>
              <Typography variant="bodyMedium" className="font-semibold text-gray-800">
                {data?.in_time ? format(new Date(data?.in_time), "HH:mm") : "--:--"}
              </Typography>
            </div>

            <div className="text-center">
              <Typography
                variant="bodySmall"
                color="body2"
                className="font-medium"
              >
                Check-out
              </Typography>
              <Typography variant="bodyMedium" className="font-semibold text-gray-800">
                {data?.out_time ? format(new Date(data?.out_time), "HH:mm") : "--:--"}
              </Typography>
            </div>

            <div className="text-center">
              <Typography
                variant="bodySmall"
                color="body2"
                className="font-medium"
              >
                Working Hours
              </Typography>
              <Typography variant="bodyMedium" className="font-semibold text-gray-800">
                {data?.working_hours ? `${data.working_hours.toFixed(2)} hrs` : "--:--"}
              </Typography>
            </div>
          </div>

          {isDesktop && (
            <Button
              ref={desktopButtonRef}
              variant="subtle"
              size="sm"
              onClick={() => setIsPopupOpen(!isPopupOpen)}
              className="self-center h-full px-2 text-gray-600 hover:text-gray-800"
            >
              <EllipsisVertical size={18} />
            </Button>
          )}
        </div>
      </div>

      {/* Popups */}
      <EditAttendance
        employeeId={data?.employee}
        employeeName={data?.employee_name}
        onClose={() => {
          setEditAttendance(false);
          setIsPopupOpen(false);
        }}
        open={editAttendance}
        requestId={data?.reports_to}
        onRefetchData={onRefetchData}
      />

      <ContextualPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        triggerRef={isDesktop ? desktopButtonRef : mobileButtonRef}
      >
        <Button
          variant="subtle"
          fullWidth
          contentAlign="start"
          onClick={() => {
            setIsPopupOpen(false);
            setEditAttendance(true);
          }}
          className="text-sm px-4 py-2"
        >
          <Edit size={16} />
          Edit
        </Button>
      </ContextualPopup>
    </div>
  );
};

export default EmployeeStatusCard;
