"use client";

import { useState } from "react";
import { Check, Circle } from "lucide-react";
import LayoutHeader from "../../shared/LayoutHeader";
import { format, subMonths } from "date-fns";

export interface MonthOption {
  label: string;
  value: string;
}
const generateMonthOptions = (count: number): MonthOption[] => {
  const now = new Date();

  return Array.from({ length: count }, (_, i) => {
    const date = subMonths(now, i);
    return {
      label: format(date, "MMM-yyyy"),
      value: format(date, "yyyy-MM"),
    };
  });
};
const monthOptions: MonthOption[] = generateMonthOptions(12);

const SelectByMonth = ({
  onClose,
  onChange,
  selected,
}: {
  onClose: () => void;
  onChange: (value: MonthOption) => void;
  selected: MonthOption;
}) => {
  const [selectedMonth, setSelectedMonth] = useState<MonthOption>(selected);

  const handleApply = () => {
    onChange(selectedMonth);
    onClose();
  };

  return (
    <div className="fixed overflow-scroll top-0 z-50 w-full mx-auto left-0 h-screen bg-white">
      <LayoutHeader
        tab="Select By Month"
        onBack={() => {
          onClose();
        }}
        icon="x"
      />

      {/* Month Selection List */}
      <div className="px-4 pb-20 pt-16">
        <div className="space-y-1">
          {monthOptions.map((month) => (
            <button
              key={month.value}
              onClick={() => setSelectedMonth(month)}
              className="mb-4 w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg last:border-b-0 border-1 border-gray-100 bg-white shadow-sm rounded-xl"
            >
              <span className="text-gray-900 font-medium text-left">
                {month.label}
              </span>

              <div className="flex items-center">
                {selectedMonth.value === month.value ? (
                  <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center">
                    <Circle className="w-3 h-3 text-transparent" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Apply Button */}
      <div className="sticky bottom-0 left-0 right-0 bg-white w-full p-2 border-2 border-white">
        <button
          onClick={handleApply}
          className="w-full flex-1 w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default SelectByMonth;
