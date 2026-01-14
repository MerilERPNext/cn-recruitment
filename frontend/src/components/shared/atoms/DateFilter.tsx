import React from "react";
import { setMonth, setYear } from "date-fns";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface DateFilterProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    label?: string; // Kept for interface compatibility but not used in display
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const DateFilter: React.FC<DateFilterProps> = ({
    currentDate,
    onDateChange,
}) => {
    const currentMonthIndex = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const handlePreviousMonth = () => {
        const newMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
        onDateChange(setMonth(currentDate, newMonthIndex));
    };

    const handleNextMonth = () => {
        const newMonthIndex = currentMonthIndex === 11 ? 0 : currentMonthIndex + 1;
        onDateChange(setMonth(currentDate, newMonthIndex));
    };

    const handlePreviousYear = () => {
        onDateChange(setYear(currentDate, currentYear - 1));
    };

    const handleNextYear = () => {
        onDateChange(setYear(currentDate, currentYear + 1));
    };

    const handleToday = () => {
        onDateChange(new Date());
    };

    return (
        <div className="mb-6 flex justify-start"> {/* Align to start */}
            <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm p-1">

                {/* Month Control */}
                <div className="flex items-center relative group">
                    <button
                        onClick={handlePreviousMonth}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-100"
                        aria-label="Previous Month"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-[80px] text-center px-1">
                        <span className="text-sm font-bold text-gray-900 block select-none">
                            {MONTHS[currentMonthIndex]}
                        </span>
                    </div>
                    <button
                        onClick={handleNextMonth}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-100"
                        aria-label="Next Month"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Divider */}
                <div className="w-px h-5 bg-gray-200 mx-1" />

                {/* Year Control */}
                <div className="flex items-center">
                    <button
                        onClick={handlePreviousYear}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-100"
                        aria-label="Previous Year"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-[50px] text-center px-1">
                        <span className="text-sm font-bold text-gray-900 block select-none">
                            {currentYear}
                        </span>
                    </div>
                    <button
                        onClick={handleNextYear}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-100"
                        aria-label="Next Year"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Divider */}
                <div className="w-px h-5 bg-gray-200 mx-1" />

                {/* Today Action */}
                <button
                    onClick={handleToday}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-primary-50 text-gray-500 hover:text-primary-600 transition-all font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                    title="Reset to Today"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Today</span>
                </button>
            </div>
        </div>
    );
};

export default DateFilter;
