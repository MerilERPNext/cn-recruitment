import { AlertCircle, Calendar, Download, FileText } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import type { ScheduledDataImport } from "../../types/scheduledImports";
import { formatToIndianDateWithTime } from "../../utils/formatToIndianDate";
import Button from "../shared/atoms/Button";
import { Card } from "../shared/atoms/Card";
import StatusBadge from "../shared/atoms/statusBadge";
import { Typography } from "../shared/atoms/Typography";
import WrapperHoverCard from "../shared/WrapperHoverCard";

interface ImportMobileCardProps {
  item: ScheduledDataImport;
  onErrorReport: (item: ScheduledDataImport) => void;
  onDownloadFile: (item: ScheduledDataImport) => void;
}

const getFileBasename = (filePath: string | null): string => {
  if (!filePath) return "—";
  return filePath.split("/").pop() ?? filePath;
};

/**
 * Mobile card view for a single Scheduled Data Import record.
 */
const ImportMobileCard: React.FC<ImportMobileCardProps> = ({
  item,
  onErrorReport,
  onDownloadFile,
}) => {
  const fileName = getFileBasename(item.file_to_import);
  const initiatedOn = formatToIndianDateWithTime(item.creation);
  const { data: employeeData } = useEmployeeByUserId(item.owner || "");

  return (
    <Card
      radius="lg"
      className="border border-gray-100 p-4 mb-3 hover:shadow-md transition-shadow"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Typography
              variant="label"
              className="font-mono text-gray-500 text-xs mb-0.5 block"
            >
              {item.name}
            </Typography>
            <Typography
              variant="bodySmall"
              className="font-semibold text-gray-900 truncate"
            >
              {item.import_type || "—"}
            </Typography>
          </div>
          <StatusBadge status={item.status} />
        </div>

        {/* File info */}
        <div className="flex items-center gap-1.5 text-gray-500">
          <FileText size={13} className="flex-shrink-0" />
          <Typography
            variant="bodySmall"
            className="text-xs truncate"
            title={item.file_to_import ?? "—"}
          >
            {fileName}
          </Typography>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
          <div>
            <Typography
              variant="label"
              className="text-gray-400 text-xs mb-0.5 block"
            >
              Initiated On
            </Typography>
            <div className="flex items-center gap-1">
              <Calendar size={12} className="text-gray-400 flex-shrink-0" />
              <Typography variant="bodySmall" className="text-xs">
                {initiatedOn}
              </Typography>
            </div>
          </div>
          <div>
            <Typography
              variant="label"
              className="text-gray-400 text-xs mb-0.5 block"
            >
              Schedule
            </Typography>
            <Typography variant="bodySmall" className="text-xs">
              {item.schedule_the_import ?? "—"}
            </Typography>
          </div>
          <div className="col-span-2 mt-1">
            <Typography
              variant="label"
              className="text-gray-400 text-xs mb-0.5 block"
            >
              Initiated By
            </Typography>

            <Link
              to={`/webapp/employee-profile?target_user=${employeeData?.name}`}
              target="_blank"
              className="inline-block"
            >
              <WrapperHoverCard
                employeeId={employeeData?.name}
                className="min-w-0"
              >
                <Typography
                  variant="bodySmall"
                  className="text-xs font-medium text-blue-600 hover:underline truncate max-w-[200px]"
                >
                  {employeeData?.employee_name || employeeData?.name}
                </Typography>
              </WrapperHoverCard>
            </Link>
          </div>
        </div>

        {/* Summary */}
        {item.import_log && (
          <div className="bg-gray-50 rounded-lg p-2">
            <Typography
              variant="label"
              className="text-gray-400 text-xs mb-0.5 block"
            >
              Summary
            </Typography>
            <Typography variant="bodySmall" className="text-xs text-gray-600">
              {item.import_log}
            </Typography>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {item.failed_records_count > 0 && (
            <Button
              size="sm"
              variant="outline"
              bgColor="error"
              onClick={() => onErrorReport(item)}
              className="flex-1 text-xs"
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
              className="flex-1 text-xs"
            >
              <Download size={12} />
              Download File
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ImportMobileCard;
