import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Copy, MoreVertical, CopyCheck, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import Button from '../../../shared/atoms/Button';
import { Typography } from '../../../shared/atoms/Typography';
import { useScreenSize } from '../../../../hooks/useScreenSize';
import DropdownMenu from '../../../shared/DropDownMenu';

import { toast } from 'react-hot-toast';

interface TimesheetTopBarProps {
  currentWeekStart: Date;
  currentWeekEnd: Date;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  handleWeekChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isReadOnly: boolean;
  isGridEditable: boolean;
  handleCopyLastWeek: () => void;
  handleDownloadTemplate: () => void;
  handleUploadExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDropExcel?: (file: File) => void;
  timesheetStatus: string;
}

export const TimesheetTopBar: React.FC<TimesheetTopBarProps> = ({
  currentWeekStart,
  currentWeekEnd,
  handlePrevWeek,
  handleNextWeek,
  handleWeekChange,
  isReadOnly,
  isGridEditable,
  handleCopyLastWeek,
  handleDownloadTemplate,
  handleUploadExcel,
  handleDropExcel,
  timesheetStatus
}) => {
  const { isDesktop } = useScreenSize();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingExcel, setIsDraggingExcel] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isReadOnly && isGridEditable) {
      setIsDraggingExcel(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isReadOnly && isGridEditable) {
      setIsDraggingExcel(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingExcel(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingExcel(false);

    if (isReadOnly || !isGridEditable) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
        if (handleDropExcel) {
          handleDropExcel(file);
        }
      } else {
        toast.error("Please drop a valid Excel or CSV file (.xlsx, .xls, .csv)");
      }
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const mobileMenuItems = [
    ...(!isReadOnly && isGridEditable
      ? [
          {
            label: "Upload Excel",
            icon: <Upload className="w-4 h-4" />,
            onClick: handleUploadClick,
          },
          {
            label: "Copy last week hours",
            icon: <CopyCheck className="w-4 h-4" />,
            onClick: handleCopyLastWeek,
          },
        ]
      : []),
    {
      label: "Download Template",
      icon: <Download className="w-4 h-4" />,
      onClick: handleDownloadTemplate,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:mx-0 lg:px-0 lg:bg-transparent lg:py-0 lg:backdrop-blur-none">
      {/* Hidden File Input for Excel Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleUploadExcel}
        className="hidden"
      />

      {/* Week Date Picker */}
      <div className="flex items-center justify-between w-full lg:w-auto gap-2 sm:gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
        <button
          onClick={handlePrevWeek}
          className="p-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center justify-center flex-1 mx-auto">
          <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-3">
            <Typography variant="bodySmall" color="title" className="font-semibold text-xs sm:text-sm">{format(currentWeekStart, "dd MMM")}</Typography>
            <Typography variant="bodySmall" color="title" className="font-semibold text-xs sm:text-sm">-</Typography>
            <Typography variant="bodySmall" color="title" className="font-semibold text-xs sm:text-sm">{format(currentWeekEnd, "dd MMM yyyy")}</Typography>
          </div>
          {/* Week Picker (selects year, month & week) */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="relative">
              <label className="p-1.5 sm:p-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100 flex items-center justify-center cursor-pointer" title="Pick Week">
                <Calendar className="w-4 h-4 text-gray-600" />
                <input
                  type="week"
                  onChange={handleWeekChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>

            {!isDesktop && mobileMenuItems.length > 0 && (
              <DropdownMenu
                items={mobileMenuItems}
                placement="bottom-left"
              >
                <div className="p-1.5 sm:p-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 cursor-pointer" title="More actions">
                  <MoreVertical className="w-4 h-4" />
                </div>
              </DropdownMenu>
            )}
          </div>
        </div>
        <button
          onClick={handleNextWeek}
          className="p-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Center Actions */}
      {isDesktop && (
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full lg:w-auto">
          {!isReadOnly && isGridEditable && (
            <>
              <div
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="relative inline-flex"
              >
                <Button
                  variant="outline"
                  bgColor="primary"
                  size="md"
                  icon={<Upload className={`w-4 h-4 transition-transform ${isDraggingExcel ? 'scale-125 text-primary-700 animate-bounce' : ''}`} />}
                  onClick={handleUploadClick}
                  className={`justify-center transition-all ${
                    isDraggingExcel
                      ? "bg-primary-50 ring-2 ring-primary ring-offset-1 border-primary border-dashed font-semibold scale-105"
                      : ""
                  }`}
                >
                  {isDraggingExcel ? "Drop Excel here" : "Upload Excel"}
                </Button>
              </div>
              <Button
                variant="outline"
                bgColor="primary"
                size="md"
                icon={<Copy className="w-4 h-4" />}
                onClick={handleCopyLastWeek}
                className="justify-center"
              >
                Copy last week hours
              </Button>
            </>
          )}
          <Button
            variant="outline"
            bgColor="primary"
            size="md"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownloadTemplate}
            className="justify-center"
          >
            Download Template
          </Button>
        </div>
      )}

      {/* Right Status / Submit toggle */}
      {isDesktop && (
        <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm text-sm">
          <div className="flex items-center gap-2">
            <Typography variant="bodySmall" color="body1" className="font-semibold">Timesheet Status:</Typography>
            <Typography variant="caption" className={`px-2.5 py-1 rounded-xl font-semibold ${timesheetStatus === "Approved" ? "bg-green-50 text-green-700 border border-green-100" :
              timesheetStatus === "Submitted" || timesheetStatus === "Pending for Approval" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                timesheetStatus === "Rejected" ? "bg-red-50 text-red-700 border border-red-100" :
                  "bg-gray-50 text-gray-700 border border-gray-100"
              }`}>
              {timesheetStatus === "Pending for Approval" ? "Submitted" : timesheetStatus}
            </Typography>
          </div>
        </div>
      )}
    </div>
  );
};
