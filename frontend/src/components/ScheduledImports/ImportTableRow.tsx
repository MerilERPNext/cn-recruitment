import { AlertCircle, Download, FileText } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import type { ScheduledDataImport } from "../../types/scheduledImports";
import { formatToIndianDateWithTime } from "../../utils/formatToIndianDate";
import {
  sanitizeToPlainText,
  truncateByChars,
} from "../../utils/sanitizeToPlainText";
import Button from "../shared/atoms/Button";
import StatusBadge from "../shared/atoms/statusBadge";
import { Typography } from "../shared/atoms/Typography";
import Tooltip from "../shared/Tooltip";
import WrapperHoverCard from "../shared/WrapperHoverCard";

interface ImportTableRowProps {
  item: ScheduledDataImport;
  columnWidths: string[];
  onErrorReport: (item: ScheduledDataImport) => void;
  onDownloadFile: (item: ScheduledDataImport) => void;
}

const getFileBasename = (filePath: string | null): string => {
  if (!filePath) return "—";
  return filePath.split("/").pop() ?? filePath;
};

const ImportTableRow: React.FC<ImportTableRowProps> = ({
  item,
  columnWidths,
  onErrorReport,
  onDownloadFile,
}) => {
  const fileName = getFileBasename(item.file_to_import);
  const initiatedOn = formatToIndianDateWithTime(item.creation);
  const { data: employeeData } = useEmployeeByUserId(item.owner || "");

  const cleanLog = sanitizeToPlainText(item.import_log);
  const truncatedLog = truncateByChars(cleanLog, 40);

  return (
    <div
      className="grid gap-4 px-6 py-4 border-t border-gray-100 hover:bg-blue-50/30 transition-colors items-center min-w-max bg-white"
      style={{ gridTemplateColumns: columnWidths.join(" ") }}
    >
      {/* Import ID */}
      <div className="flex items-center justify-center">
        <Typography variant="bodySmall" className="font-semibold text-gray-800">
          {item.name}
        </Typography>
      </div>

      {/* Import Name */}
      <div className="flex items-center justify-center min-w-0">
        <Tooltip
          content={item.import_type || "—"}
          triggerClassName="min-w-0 w-full text-center"
        >
          <Typography
            variant="bodySmall"
            className="font-medium text-gray-800 truncate block cursor-pointer"
          >
            {item.import_type || "—"}
          </Typography>
        </Tooltip>
      </div>

      {/* Source */}
      <div className="flex items-center justify-center gap-1.5">
        <FileText
          size={14}
          className="font-medium text-gray-800 flex-shrink-0"
        />
        <Typography variant="bodySmall" className="text-gray-600">
          File
        </Typography>
      </div>

      {/* File Name */}
      <div className="flex items-center justify-center min-w-0">
        <Tooltip
          content={item.file_to_import ?? "—"}
          triggerClassName="min-w-0 w-full text-center"
        >
          <Typography
            variant="bodySmall"
            className="font-medium text-gray-800 truncate block cursor-pointer"
          >
            {fileName}
          </Typography>
        </Tooltip>
      </div>

      {/* Initiated On */}
      <div className="flex items-center justify-center">
        <Typography variant="bodySmall" className="font-medium text-gray-800">
          {initiatedOn}
        </Typography>
      </div>

      {/* Initiated By */}
      <div className="flex items-center justify-center min-w-0">
        <Link
          to={`/webapp/employee-profile?target_user=${employeeData?.name}`}
          target="_blank"
          className="min-w-0 w-full text-center"
        >
          <WrapperHoverCard
            employeeId={employeeData?.name}
            className="min-w-0 w-full"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-gray-800 truncate block"
            >
              {employeeData?.employee_name || employeeData?.name}
            </Typography>
          </WrapperHoverCard>
        </Link>
      </div>

      {/* Scheduled Time */}
      <div className="flex items-center justify-center min-w-0">
        <Typography
          variant="bodySmall"
          className="font-medium text-gray-800 truncate block"
        >
          {item.schedule_the_import ?? "—"}
        </Typography>
      </div>

      {/* Status */}
      <div className="flex items-center justify-center">
        <StatusBadge status={item.status} />
      </div>

      {/* Summary */}
      <div className="flex items-center justify-center min-w-0">
        <Tooltip
          content={cleanLog}
          triggerClassName="w-full truncate min-w-0 block"
        >
          <Typography
            variant="bodySmall"
            className="font-medium text-gray-800 text-center truncate block w-full cursor-pointer"
          >
            {truncatedLog}
          </Typography>
        </Tooltip>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-2 min-w-0">
        {item.failed_records_count > 0 && (
          <Button
            size="sm"
            variant="outline"
            bgColor="error"
            onClick={() => onErrorReport(item)}
            className="text-xs flex items-center gap-1 flex-shrink-0"
          >
            <AlertCircle size={12} />
            Error Report
          </Button>
        )}
        {item.file_to_import && (
          <Button
            size="sm"
            variant="contain"
            bgColor="primary"
            onClick={() => onDownloadFile(item)}
            className="text-xs flex items-center gap-1 flex-shrink-0"
          >
            <Download size={12} />
            Download File
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImportTableRow;
