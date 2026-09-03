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

  const cleanLog = React.useMemo(
    () => sanitizeToPlainText(item.import_log),
    [item.import_log],
  );
  const truncatedLog = React.useMemo(
    () => truncateByChars(cleanLog, 40),
    [cleanLog],
  );

  return (
    <div
      className="grid gap-4 px-6 py-4 border-t border-slate-100 dark:border-[#1E3A4C]/60 hover:bg-slate-50 dark:hover:bg-[#102030] transition-colors items-center min-w-max bg-white dark:bg-[#0B1724]"
      style={{ gridTemplateColumns: columnWidths.join(" ") }}
    >
      {/* Import ID */}
      <div className="flex items-center justify-center">
        <Typography variant="bodySmall" className="font-semibold text-slate-800 dark:text-slate-100">
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
            className="font-medium text-slate-800 dark:text-slate-100 truncate block cursor-pointer"
          >
            {item.import_type || "—"}
          </Typography>
        </Tooltip>
      </div>

      {/* Source */}
      <div className="flex items-center justify-center gap-1.5">
        <FileText
          size={14}
          className="font-medium text-slate-600 dark:text-slate-400 flex-shrink-0"
        />
        <Typography variant="bodySmall" className="text-slate-600 dark:text-slate-300">
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
            className="font-medium text-slate-800 dark:text-slate-100 truncate block cursor-pointer"
          >
            {fileName}
          </Typography>
        </Tooltip>
      </div>

      {/* Initiated On */}
      <div className="flex items-center justify-center">
        <Typography variant="bodySmall" className="font-medium text-slate-700 dark:text-slate-300">
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
              className="font-medium text-slate-800 dark:text-slate-100 hover:text-cyan-600 dark:hover:text-cyan-400 truncate block transition-colors"
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
          className="font-medium text-slate-700 dark:text-slate-300 truncate block"
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
            className="font-medium text-slate-700 dark:text-slate-300 text-center truncate block w-full cursor-pointer"
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
            className="text-xs flex items-center gap-1 flex-shrink-0 bg-cyan-600 dark:bg-cyan-500 hover:bg-cyan-700 dark:hover:bg-cyan-600 !text-white"
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
