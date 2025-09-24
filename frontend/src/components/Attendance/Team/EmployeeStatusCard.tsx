import { format } from "date-fns";
import { useState, useRef } from "react";
import { EmployeeStatus, EmployeeStatusType } from "../../../types/attendance";
import Avatar from "../../shared/Avatar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Edit, EllipsisVertical } from "lucide-react";
import ContextualPopup from "../../shared/molecules/ContextualPopup";
import AttendanceRequestForm from "../AttendanceRequest/AttendanceRequestForm";
import { createPortal } from "react-dom";

const EmployeeStatusCard = ({ data }: { data: EmployeeStatus }) => {
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
    <div
      className={`w-full p-3 border shadow-sm rounded-xl transition-all duration-200 bg-white border border-gray-100 mt-2`}
    >
      <div className="flex gap-4 mb-2">
        <Avatar
          name={data?.employee_name}
          avatarBgColor={isDesktop ? "bg-white" : "bg-indigo-100"}
          avatarTextColor={isDesktop ? "text-gray-700" : "text-indigo-800"}
          {...statusColors}
        />
        <div className="flex-1">
          <h5 className="font-semibold line-clamp-2 text-gray-800">
            {data?.employee_name}
          </h5>
          <div className="flex items-center gap-2 mt-1">
            <p
              className={`font-medium text-sm capitalize ${
                isDesktop ? "text-gray-700" : "text-gray-600"
              }`}
            >
              {data?.status}
            </p>
          </div>
        </div>
        <button
          ref={buttonRef}
          onClick={() => setIsPopupOpen(true)}
          className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <EllipsisVertical size={18} />
        </button>
      </div>
      {(data?.in_time || data?.out_time) && (
        <div
          className={`mb-2 w-full px-4 py-3 rounded-xl flex justify-between ${
            isDesktop
              ? "bg-gray-100 border border-white border-opacity-50"
              : "bg-gray-100"
          }`}
        >
          <div>
            <p className="text-gray-500 text-xs text-center font-medium">
              Check-in
            </p>
            <h5 className="font-semibold text-center text-gray-800">
              {data?.in_time
                ? format(new Date(data?.in_time), "HH:mm")
                : "--:--"}
            </h5>
          </div>
          <div className="w-px bg-gray-200 mx-2"></div>
          <div>
            <p className="text-gray-500 text-xs text-center font-medium">
              Check-out
            </p>
            <h5 className="font-semibold text-center text-gray-800">
              {data?.out_time
                ? format(new Date(data?.out_time), "HH:mm")
                : "--:--"}
            </h5>
          </div>
        </div>
      )}
      {editAttendance &&
        createPortal(
          <AttendanceRequestForm
            isEditing={true}
            onClose={() => setEditAttendance(false)}
          />,
          document.body
        )}{" "}
      <ContextualPopup
        isOpen={isPopupOpen}
        onClose={() => {
          setIsPopupOpen(false);
        }}
        triggerRef={buttonRef}
      >
        <div className="p-1">
          <button
            onClick={() => {
              setEditAttendance(true);
            }}
            className="w-full text-left font-md px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex gap-2 justify-start items-center"
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
