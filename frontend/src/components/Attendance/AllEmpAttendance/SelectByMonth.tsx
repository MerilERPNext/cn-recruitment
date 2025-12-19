import { useState } from "react";
import { Check, Circle, X } from "lucide-react";
import { generateMonthOptions } from "../../../utils/helperUtils";

export interface MonthOption {
  label: string;
  value: string;
}

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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[90vh] bg-white md:rounded-lg flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            Select By Month
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Month Selection List */}
        <div className="px-4 pb-20 pt-2 overflow-y-scroll">
          <div className="space-y-1">
            {monthOptions.map((month) => (
              <button
                key={month.value}
                onClick={() => setSelectedMonth(month)}
                className="mb-4 w-full flex items-center justify-between p-4 hover:bg-blue-50 transition-colors rounded-lg last:border-b-0 border-1 border-gray-100 bg-white shadow-sm rounded-xl"
              >
                <span className="text-gray-900 font-medium text-left">
                  {month.label}
                </span>

                <div className="flex items-center">
                  {selectedMonth.value === month.value ? (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
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
        <div className="sticky bottom-0 left-0 right-0 bg-white w-full p-4 border-t border-gray-200">
          <button
            onClick={handleApply}
            className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectByMonth;
