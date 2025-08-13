import { Plus } from "lucide-react";
import LayoutHeader from "../../shared/LayoutHeader";
import { useState, useMemo } from "react";
import AttendanceRequestForm from "../AttendanceRequest/AttendanceRequestForm";
import { useLocation } from "react-router";
import { endOfDay, format, startOfDay, isValid } from "date-fns";
import { useAllEmployeeCheckIns } from "../../../hooks/useAttendance";
import { EmployeeCheckInLog } from "../../../types/attendance";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";

const EmployeeAttendanceDetails = () => {
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const dateParam = query.get("date");
  const status = query.get("status");
  const [showReqAttendanceCorrection, setShowReqAttendanceCorrection] =
    useState(false);

  const validDate = useMemo(() => {
    const d = new Date(dateParam || "");
    return isValid(d) ? d : null;
  }, [dateParam]);
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { start, end } = useMemo(() => {
    if (!validDate) return { start: "", end: "" };
    return {
      start: format(startOfDay(validDate), "yyyy-MM-dd HH:mm:ss"),
      end: format(endOfDay(validDate), "yyyy-MM-dd HH:mm:ss"),
    };
  }, [validDate]);

  const { data: empCheckIns, isLoading } = useAllEmployeeCheckIns(
    validDate
      ? [
          ["time", "between", [start, end]],
          ["employee", "=", currentEmployee?.employee],
        ]
      : []
  );

  return (
    <div className="h-screen bg-white flex flex-col">
      <LayoutHeader tab="Attendance Details" />

      {isLoading ? (
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin border-2 border-black border-t-transparent rounded-full w-5 h-5"></div>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto mt-14 p-4">
          {empCheckIns && empCheckIns.length > 0 ? (
            <div className="flex flex-col gap-3">
              {empCheckIns.map((record) => (
                <AttendanceCard key={record?.name} record={record} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600">
              No check-ins available for{" "}
              <span className="font-semibold">
                {validDate ? format(validDate, "dd/MM/yyyy") : "Unknown Date"}
              </span>
            </p>
          )}

          {status === "absent" && (
            <p className="text-sm mt-4 text-gray-700">
              To correct your attendance for this day, submit a request below.{" "}
            </p>
          )}
        </div>
      )}

      <div className="p-3 border-t bg-white">
        <button
          disabled={status !== "absent" && status !== "half-day"}
          className={`w-full flex items-center justify-center py-3 rounded-lg text-md font-medium transition-colors ${
            status !== "absent" && status !== "half-day"
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-black hover:bg-gray-800"
          } text-white`}
          onClick={() =>
            setShowReqAttendanceCorrection(!showReqAttendanceCorrection)
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          Attendance Request
        </button>
      </div>

      {showReqAttendanceCorrection && (
        <AttendanceRequestForm
          onClose={() => setShowReqAttendanceCorrection(false)}
        />
      )}
    </div>
  );
};

export default EmployeeAttendanceDetails;

const AttendanceCard = ({ record }: { record: EmployeeCheckInLog }) => {
  return (
    <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200 hover:shadow-lg transition">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-800">
          {record.employee}
        </h2>
        <span
          className={`text-sm font-medium px-2 py-1 rounded-lg
            ${
              record.log_type === "IN"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
        >
          {record.log_type}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p>{format(new Date(record.time), "hh:mm a, dd/MM/yyyy")}</p>
      </div>
    </div>
  );
};
