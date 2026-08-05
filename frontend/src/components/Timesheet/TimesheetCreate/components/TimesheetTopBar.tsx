import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Copy, MoreVertical, CopyCheck } from 'lucide-react';
import { format } from 'date-fns';
import Button from '../../../shared/atoms/Button';
import { Typography } from '../../../shared/atoms/Typography';
import { useScreenSize } from '../../../../hooks/useScreenSize';
import DropdownMenu from '../../../shared/DropDownMenu';

interface TimesheetTopBarProps {
  currentWeekStart: Date;
  currentWeekEnd: Date;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  handleWeekChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isReadOnly: boolean;
  isGridEditable: boolean;
  handleCopyLastWeek: () => void;
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
  timesheetStatus
}) => {
  const { isDesktop } = useScreenSize();
  return (
    <div className={`sticky top-0 z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:mx-0 lg:px-0 lg:bg-transparent lg:py-0 lg:backdrop-blur-none`}>
      {/* Week Date Picker */}
      <div className="flex items-center justify-between w-full lg:w-auto gap-2 sm:gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
        <button
          onClick={handlePrevWeek}
          className="p-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className='flex items-center justify-center flex-1 mx-auto'>
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

            {(!isDesktop && !isReadOnly && isGridEditable) && (
              <DropdownMenu
                items={[
                  {
                    label: "Copy last week hours",
                    icon: <CopyCheck className="w-4 h-4" />,
                    onClick: handleCopyLastWeek
                  }
                ]}
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
      {(isDesktop && !isReadOnly && isGridEditable) && (
        <div className="flex items-center w-full lg:w-auto">
          <div className="w-full lg:w-auto flex justify-center">
            <Button
              variant="outline"
              bgColor="primary"
              size="md"
              icon={<Copy className="w-4 h-4" />}
              onClick={handleCopyLastWeek}
              className="w-full lg:w-auto justify-center"
            >
              Copy last week hours
            </Button>
          </div>
        </div>
      )}

      {/* Right Status / Submit toggle */}
      {isDesktop &&
        < div className="flex  items-center gap-4 bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm text-sm">
          <div className="flex items-center gap-2">
            <Typography variant="bodySmall" color="body1" className="font-semibold">Timesheet Status:</Typography>
            <Typography variant="caption" className={`px-2.5 py-1 rounded-xl font-semibold ${timesheetStatus === "Submitted" ? "bg-blue-50 text-blue-700 border border-blue-100" :
              timesheetStatus === "Billed" ? "bg-green-50 text-green-700 border border-green-100" :
                "bg-yellow-50 text-yellow-700 border border-yellow-100"
              }`}>
              {timesheetStatus}
            </Typography>

          </div>
        </div>
      }
    </div >
  );
};
