import Button from "../shared/atoms/Button";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useGetAttendanceStatus } from "../../hooks/useLeaves";
import Badge from "../shared/Badge";
import formatToIndianDate from "../../utils/formatToIndianDate";

const AttendanceStatusModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  fromDate: string;
  toDate: string;
}> = ({ isOpen, onClose, fromDate, toDate }) => {
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const {
    data: attendanceStatus,
    isLoading,
    isError,
  } = useGetAttendanceStatus(currentEmployee?.name, fromDate, toDate);

  if (!isOpen) return null;

  const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    Present: {
      bg: "bg-green-100",
      text: "text-green-800",
    },
    Absent: {
      bg: "bg-red-100",
      text: "text-red-800",
    },
    "On Leave": {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
    },
    "Half Day": {
      bg: "bg-orange-100",
      text: "text-orange-800",
    },
    "Work From Home": {
      bg: "bg-blue-100",
      text: "text-blue-800",
    },
  };

  const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4">
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </td>
          <td className="px-6 py-4">
            <div className="h-5 w-28 bg-gray-200 rounded-lg" />
          </td>
        </tr>
      ))}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="base-title md:module-title font-semibold text-gray-800">
            Attendance Status
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
          {isError ? (
            <div className="p-8 text-center text-red-500">
              Failed to load attendance data.
            </div>
          ) : attendanceStatus?.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-gray-500">
              No attendance records found for the selected date range.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <TableSkeleton />
                ) : (
                  attendanceStatus?.map((record, index) => {
                    const style = STATUS_STYLES[record.status] || {
                      bg: "bg-gray-100",
                      text: "text-gray-800",
                    };

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatToIndianDate(record.attendance_date)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            label={record?.status || ""}
                            backgroundColor={style.bg}
                            textColor={style.text}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t p-4">
          <Button
            onClick={onClose}
            variant="contain"
            bgColor="disabled"
            className="w-full py-2"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceStatusModal;
