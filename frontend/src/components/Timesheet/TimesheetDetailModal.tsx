import { X } from "lucide-react";
import Modal from "../shared/Modal";
import { Typography } from "../shared/atoms/Typography";
import StatusBadge from "../shared/atoms/statusBadge";
import Tooltip from "../shared/Tooltip";
import formatToIndianDate, { formatToIndianDateWithTime } from "../../utils/formatToIndianDate";
import { useFrappeDocument } from "../../hooks/useFrappeQuery";
import { LoadingView, ErrorView } from "../shared/DetailViewErrorLoadingWrapper";
import { useCompanyMap } from "../../hooks/useCompanyMap";
import { TimesheetListRecord, TimesheetResponse, TimesheetDetail } from "../../types/timesheet";
import { timesheetDisplayStatus } from "../../utils/statusDisplay/timesheetStatus";
import { useScreenSize } from "../../hooks/useScreenSize";

interface TimesheetDetailModalProps {
  timesheetId: string;
  listItem?: TimesheetListRecord;
  onClose: () => void;
}

const TimesheetDetailModal = ({ timesheetId, listItem, onClose }: TimesheetDetailModalProps) => {
  const { data: rawData, isLoading, error } = useFrappeDocument("Timesheet", timesheetId);
  const data = rawData as TimesheetResponse | undefined;
  const { companyMap } = useCompanyMap();

  const { isDesktop } = useScreenSize();

  if (isLoading) {
    return <LoadingView onClose={onClose} label="Timesheet Details" />;
  }

  if (error) {
    return <ErrorView onClose={onClose} label="Timesheet Details" error={error as Error} />;
  }

  return (
    <Modal isOpen={true} onClose={onClose} size={isDesktop ? "full" : "lg"}>
      <div className="flex flex-col bg-white overflow-hidden rounded-xl h-full sm:max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <Typography variant="h4" className="text-gray-900">
              {timesheetId}
            </Typography>
            {data && data.employee_name && (
              <Typography variant="bodySmall" color="body2" className="mt-1">
                {data.employee_name} ({data.employee})
              </Typography>
            )}
          </div>
          <div className="flex items-center gap-4">
            {data && <StatusBadge status={timesheetDisplayStatus(data.status)} />}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {data ? (
            <div className="space-y-8">
              {/* Summary Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 mb-1">Company</Typography>
                  <Tooltip content={data.company ? companyMap[data.company] || data.company : null} position="top" triggerClassName="block truncate max-w-full w-full">
                    <Typography variant="bodyMedium" className="font-medium text-gray-900 truncate">{data.company ? companyMap[data.company] || data.company : "-"}</Typography>
                  </Tooltip>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 mb-1">Customer</Typography>
                  <Tooltip content={listItem?.customer_name || data.customer_name || data.customer || null} position="top" triggerClassName="block truncate max-w-full w-full">
                    <Typography variant="bodyMedium" className="font-medium text-gray-900 truncate">{listItem?.customer_name || data.customer_name || data.customer || "-"}</Typography>
                  </Tooltip>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 mb-1">Project</Typography>
                  <Tooltip content={listItem?.project_name || data.project_name || data.parent_project || null} position="top" triggerClassName="block truncate max-w-full w-full">
                    <Typography variant="bodyMedium" className="font-medium text-gray-900 truncate">{listItem?.project_name || data.project_name || data.parent_project || "-"}</Typography>
                  </Tooltip>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 mb-1">Start Date</Typography>
                  <Typography variant="bodyMedium" className="font-medium text-gray-900">{data.start_date ? formatToIndianDate(data.start_date) : "-"}</Typography>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 mb-1">End Date</Typography>
                  <Typography variant="bodyMedium" className="font-medium text-gray-900">{data.end_date ? formatToIndianDate(data.end_date) : "-"}</Typography>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 mb-1">Total Hours</Typography>
                  <Typography variant="bodyMedium" className="font-medium text-gray-900">{data.total_hours || 0}</Typography>
                </div>
              </div>

              {/* Time Logs Section */}
              <div>
                <Typography variant="h4" className="mb-4">Time Logs</Typography>
                {data.time_logs && data.time_logs.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Activity</th>
                          <th className="px-4 py-3">From</th>
                          <th className="px-4 py-3">To</th>
                          <th className="px-4 py-3">Hours</th>
                          <th className="px-4 py-3">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.time_logs.map((log: TimesheetDetail & { name?: string }, idx: number) => (
                          <tr key={log.name || idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{log.activity_type}</td>
                            <td className="px-4 py-3 text-gray-600">{log.from_time ? formatToIndianDateWithTime(log.from_time) : "-"}</td>
                            <td className="px-4 py-3 text-gray-600">{log.to_time ? formatToIndianDateWithTime(log.to_time) : "-"}</td>
                            <td className="px-4 py-3 text-gray-900 font-semibold">{log.hours}</td>
                            <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                              {log.description ? (
                                <Tooltip content={log.description} position="top" triggerClassName="block truncate max-w-full">
                                  {log.description}
                                </Tooltip>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No time logs available
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};

export default TimesheetDetailModal;
