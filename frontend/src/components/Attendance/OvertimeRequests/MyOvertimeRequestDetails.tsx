import { X } from "lucide-react";
import Badge from "../../shared/Badge";
import {
  MyPlannedAttendanceRequest,
  OvertimeDetail,
} from "../../../types/attendance";
import { format, parse } from "date-fns";

export function MyOvertimeDetails({
  data,
  onClose,
  label = "Planned Overtime Request",
}: {
  data: MyPlannedAttendanceRequest;
  onClose: () => void;
  label?: string;
}) {
  const getStatus = (status: string) => {
    if (status === "Open") {
      return {
        label: "Open",
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

  const status = getStatus(data?.reference_document?.status);
  const doc = data?.reference_document;

  const formatDate = (dateString: string) => {
    const formattedDate = format(
      parse(dateString, "yyyy-MM-dd", new Date()),
      "dd/MM/yyyy"
    );
    return formattedDate || "--/--";
  };

  return data?.allocated_to ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Allocated To + Status */}
          <div className="flex gap-2 justify-between">
            <div>
              <div className="text-sm text-gray-500">Allocated To</div>
              <div className="text-base font-medium text-gray-800">
                {data.allocated_to}
              </div>
            </div>
            <div>
              <Badge
                label={status.label}
                backgroundColor={status.statusColor}
              />
            </div>
          </div>

          {/* Created On */}
          <div>
            <div className="text-sm text-gray-500">Created On</div>
            <div className="text-base text-gray-800">
              {new Date(doc?.creation).toLocaleString()}
            </div>
          </div>

          {/* Overtime Details */}
          {doc?.overtime_details?.length > 0 && (
            <div>
              <div className="text-sm text-gray-500 mb-2">Overtime Details</div>
              <div className="grid grid-cols-1 gap-4 ">
                {doc.overtime_details.map(
                  (item: OvertimeDetail, idx: number) => (
                    <div
                      key={item.name || idx}
                      className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                    >
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Overtime Entry {idx + 1}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-600">
                        <div>
                          <span className="block font-medium text-gray-800">
                            Start Date
                          </span>
                          <span>{formatDate(item.start_date)}</span>
                        </div>
                        <div>
                          <span className="block font-medium text-gray-800">
                            Start Time
                          </span>
                          <span>{item.start_time}</span>
                        </div>

                        <div>
                          <span className="block font-medium text-gray-800">
                            End Date
                          </span>
                          <span>{formatDate(item.end_date)}</span>
                        </div>
                        <div>
                          <span className="block font-medium text-gray-800">
                            End Time
                          </span>
                          <span>{item.end_time}</span>
                        </div>

                        <div>
                          <span className="block font-medium text-gray-800">
                            Shift Date
                          </span>
                          <span>{formatDate(item.shift_date)}</span>
                        </div>

                        {item.message && (
                          <div className="col-span-2">
                            <span className="block font-medium text-gray-800">
                              Message
                            </span>
                            <span>{item.message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;
}
