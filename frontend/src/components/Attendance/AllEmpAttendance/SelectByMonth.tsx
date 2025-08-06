"use client"

import { useState } from "react"
import { Check, Circle } from "lucide-react"
import LayoutHeader from "../../shared/LayoutHeader"
import { format, subMonths } from "date-fns"

export interface MonthOption {
    label: string
    value: string
}
const generateMonthOptions = (count: number): MonthOption[] => {
    const now = new Date();

    return Array.from({ length: count }, (_, i) => {
        const date = subMonths(now, i);
        return {
            label: format(date, 'MMM-yyyy'),
            value: format(date, 'yyyy-MM'),
        };
    });
};
const monthOptions: MonthOption[] = generateMonthOptions(12)

const SelectByMonth = ({ onClose, onChange, selected }: { onClose: () => void, onChange: (value: MonthOption) => void, selected: MonthOption }) => {
    const [selectedMonth, setSelectedMonth] = useState<MonthOption>(selected)

    const handleApply = () => {
        onChange(selectedMonth)
        onClose()
    }

    return (
        <div className="fixed overflow-scroll top-0 z-50 w-full mx-auto left-0 h-screen bg-white">
            <LayoutHeader
                tab="Select By Month"
                onBack={() => {
                    onClose()
                }}
                icon="x"
            />

            {/* Month Selection List */}
            <div className="px-0 pb-20 pt-12">
                <div className="space-y-1">
                    {monthOptions.map((month) => (
                        <button
                            key={month.value}
                            onClick={() => setSelectedMonth(month)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg border-b border-gray-100 last:border-b-0"
                        >
                            <span className="text-gray-900 font-medium text-left">{month.label}</span>

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
            <div className="fixed bottom-4 left-4 right-4">
                <button
                    onClick={handleApply}
                    className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-4 rounded-xl transition-colors shadow-sm"
                >
                    Apply
                </button>
            </div>
        </div>
    )
}

export default SelectByMonth
