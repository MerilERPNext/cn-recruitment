import { useScreenSize } from "../../hooks/useScreenSize";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { Typography } from "../shared/atoms/Typography";
import StatusBadge from "../shared/atoms/statusBadge";
import { useCompanyMap } from "../../hooks/useCompanyMap";
import Tooltip from "../shared/Tooltip";
import { TimesheetListRecord } from "../../types/timesheet";
import { timesheetDisplayStatus } from "../../utils/statusDisplay/timesheetStatus";

interface TimesheetItemRowProps {
  item: TimesheetListRecord;
}

const TimesheetItemRow = ({ item }: TimesheetItemRowProps) => {
  const { isDesktop } = useScreenSize();
  const { companyMap } = useCompanyMap();

  const getCompany = () => item.company ? companyMap[item.company] || item.company : "-";
  const getCustomer = () => item.customer_name || item.customer || null;
  const getProject = () => item.project_name || item.parent_project || null;

  if (isDesktop) {
    return (
      <div
        className="grid max-w-screen text-center items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors hover:bg-primary/10"
        style={{ gridTemplateColumns: "1fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr 1fr 1fr 1fr" }}
      >
        <Typography variant="bodySmall" className="font-medium text-center truncate">
          {item.name}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center truncate">
          {item.employee_name || item.employee}
        </Typography>
        <Tooltip content={getCompany() !== "-" ? getCompany() : null} position="top" triggerClassName="block truncate max-w-full w-full text-center">
          <Typography variant="bodySmall" className="font-medium truncate">
            {getCompany()}
          </Typography>
        </Tooltip>
        <Tooltip content={getCustomer() !== "-" ? getCustomer() : null} position="top" triggerClassName="block truncate max-w-full w-full text-center">
          <Typography variant="bodySmall" className="font-medium truncate">
            {getCustomer()}
          </Typography>
        </Tooltip>
        <Tooltip content={getProject() !== "-" ? getProject() : null} position="top" triggerClassName="block truncate max-w-full w-full text-center">
          <Typography variant="bodySmall" className="font-medium truncate">
            {getProject()}
          </Typography>
        </Tooltip>
        <Typography variant="bodySmall" className="font-medium text-center">
          {item.start_date ? formatToIndianDate(item.start_date) : "-"}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {item.end_date ? formatToIndianDate(item.end_date) : "-"}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {item.total_hours || 0}
        </Typography>
        <div className="flex items-center justify-center">
          <StatusBadge status={timesheetDisplayStatus(item?.status)} />
        </div>
      </div>
    );
  }

  return (
    <div className="cursor-pointer border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl mb-4">
      <div className="p-4 flex items-start gap-3 w-full">
        <div className="w-full">
          <div className="flex items-start justify-between p-1">
            <Typography variant="mobileCardLabel" className="font-semibold text-gray-900">{item.name}</Typography>
            <StatusBadge status={timesheetDisplayStatus(item.status)} />
          </div>
          <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel">Employee</Typography>
                <Typography variant="mobileCardValue">{item.employee_name || item.employee}</Typography>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel">Company</Typography>
                <Typography variant="mobileCardValue">{getCompany()}</Typography>
              </div>
            </div>
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel">Customer</Typography>
                <Typography variant="mobileCardValue">{getCustomer()}</Typography>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel">Project</Typography>
                <Typography variant="mobileCardValue">{getProject()}</Typography>
              </div>
            </div>
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel">Start Date</Typography>
                <Typography variant="mobileCardValue">{item.start_date ? formatToIndianDate(item.start_date) : "-"}</Typography>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel">End Date</Typography>
                <Typography variant="mobileCardValue">{item.end_date ? formatToIndianDate(item.end_date) : "-"}</Typography>
              </div>
            </div>
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel">Total Hours</Typography>
                <Typography variant="mobileCardValue">{item.total_hours || 0}</Typography>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetItemRow;
