import { format } from "date-fns";
import { useState, useRef } from "react";
import { EmployeeStatus, EmployeeStatusType } from "../../../types/attendance";
import Avatar from "../../shared/Avatar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Edit, EllipsisVertical } from "lucide-react";
import ContextualPopup from "../../shared/molecules/ContextualPopup";
import { EditAttendance } from "./EditAttendance";
import Badge from "../../shared/Badge";

const EmployeeStatusCard = ({
  data,
  onRefetchData,
}: {
  data: EmployeeStatus;
  onRefetchData?: (() => void) | null;
}) => {
  const { isDesktop } = useScreenSize();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [editAttendance, setEditAttendance] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const getStatusIndicatorColor = (
    status:
      | "present"
      | "absent"
      | "on leave"
      | "half day"
      | "work from home"
      | "default"
  ): { indicatorBgColor: string; indicatorBorderColor?: string } => {
    if (isDesktop) {
      // Lighter colors for desktop
      switch (status) {
        case "present":
          return {
            indicatorBgColor: "bg-green-400",
            indicatorBorderColor: "border-green-100",
          };
        case "absent":
          return {
            indicatorBgColor: "bg-red-400",
            indicatorBorderColor: "border-red-100",
          };
        case "on leave":
          return {
            indicatorBgColor: "bg-amber-400",
            indicatorBorderColor: "border-amber-100",
          };
        case "half day":
          return {
            indicatorBgColor: "bg-orange-400",
            indicatorBorderColor: "border-orange-100",
          };
        case "work from home":
          return {
            indicatorBgColor: "bg-purple-400",
            indicatorBorderColor: "border-purple-100",
          };
        default:
          return {
            indicatorBgColor: "bg-slate-300",
            indicatorBorderColor: "border-slate-100",
          };
      }
    } else {
      // Original colors for mobile
      switch (status) {
        case "present":
          return {
            indicatorBgColor: "bg-green-500",
            indicatorBorderColor: "border-white",
          };
        case "absent":
          return {
            indicatorBgColor: "bg-red-500",
            indicatorBorderColor: "border-white",
          };
        case "on leave":
          return {
            indicatorBgColor: "bg-yellow-400",
            indicatorBorderColor: "border-white",
          };
        case "half day":
          return {
            indicatorBgColor: "bg-orange-400",
            indicatorBorderColor: "border-white",
          };
        case "work from home":
          return {
            indicatorBgColor: "bg-blue-400",
            indicatorBorderColor: "border-white",
          };
        default:
          return {
            indicatorBgColor: "bg-gray-300",
            indicatorBorderColor: "border-white",
          };
      }
    }
  };

  const statusColors = getStatusIndicatorColor(
    data?.status?.toLowerCase() as EmployeeStatusType
  );

  return (
    <div className="w-full p-3 border shadow-sm rounded-xl transition-all duration-200 bg-white border border-gray-100 hover:bg-blue-50 transition-colors">
      <div className="flex flex-col sm:flex-row  gap-3 w-full">
        {/* Left Section - Avatar + Info */}
        <div className="flex items-start gap-3 flex-1 justify-center">
          <Avatar
            name={data?.employee_name}
            avatarBgColor={isDesktop ? "bg-white" : "bg-indigo-100"}
            avatarTextColor={isDesktop ? "text-gray-700" : "text-indigo-800"}
            {...statusColors}
          />
          <div className="flex-1 min-w-10">
            <div className="flex flex-wrap items-start gap-2">
              <h5 className="font-semibold text-gray-800 truncate max-w-[150px] sm:max-w-none">
                {data?.employee_name}
              </h5>
              {data?.shift ?
                <Badge size="sm" label={"Shift " + data?.shift} />
                : null
              }
            </div>
            <p
              className={`font-medium text-sm capitalize mt-1 ${isDesktop ? "text-gray-700" : "text-gray-600"
                }`}
            >
              {data?.status}
            </p>
          </div>
        </div>
        <div className="flex justify-center w-full  max-w-[700px]  gap-4">
          {/* Middle Section - Time Info */}
          <div className="flex flex-wrap sm:flex-nowrap justify-between max-w-[700px] sm:justify-between gap-4 sm:gap-6 mt-2 sm:mt-0  w-full py-1 px-4">
            <div className="text-center">
              <p className="text-gray-500 text-xs font-medium">Check-in</p>
              <h5 className="font-semibold text-gray-800">
                {data?.in_time
                  ? format(new Date(data?.in_time), "HH:mm")
                  : "--:--"}
              </h5>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-xs font-medium">Check-out</p>
              <h5 className="font-semibold text-gray-800">
                {data?.out_time
                  ? format(new Date(data?.out_time), "HH:mm")
                  : "--:--"}
              </h5>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-xs font-medium">Working Hours</p>
              <h5 className="font-semibold text-gray-800">
                {data?.working_hours
                  ? `${data.working_hours.toFixed(2)} hrs`
                  : "--:--"}
              </h5>
            </div>
          </div>

          {/* Right Section - Menu */}
          <button
            ref={buttonRef}
            onClick={() => setIsPopupOpen(!isPopupOpen)}
            className="text-gray-600 hover:text-gray-800 transition-colors self-center h-full"
          >
            <EllipsisVertical size={18} />
          </button>
        </div>
      </div>

      {/* Popups */}
      <EditAttendance
        employeeId={data?.employee}
        employeeName={data?.employee_name}
        onClose={() => setEditAttendance(false)}
        open={editAttendance}
        requestId={data?.name}
        onRefetchData={onRefetchData}
      />
      <ContextualPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        triggerRef={buttonRef}
      >
        <div className="">
          <button
            onClick={() => setEditAttendance(true)}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <Edit size={16} />
            <span>Edit</span>
          </button>
        </div>
      </ContextualPopup>
    </div>
  );
};

export default EmployeeStatusCard;
