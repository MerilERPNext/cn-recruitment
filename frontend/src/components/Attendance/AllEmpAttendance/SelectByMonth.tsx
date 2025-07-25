"use client"

import { useState } from "react"
import { Check, Circle } from "lucide-react"
import LayoutHeader from "../../shared/LayoutHeader"

export interface MonthOption {
    id: string
    label: string
    value: string
}

const monthOptions: MonthOption[] = [
    { id: "1", label: "Jul-2025", value: "2025-07" },
    { id: "2", label: "Jun-2025", value: "2025-06" },
    { id: "3", label: "May-2025", value: "2025-05" },
    { id: "4", label: "Apr-2025", value: "2025-04" },
    { id: "5", label: "Mar-2025", value: "2025-03" },
    { id: "6", label: "Feb-2025", value: "2025-02" },
    { id: "7", label: "Jan-2025", value: "2025-01" },
    { id: "8", label: "Dec-2024", value: "2024-12" },
]

const SelectByMonth = ({ onClose, onChange }: { onClose: () => void, onChange: (value: MonthOption) => void }) => {
    const [selectedMonth, setSelectedMonth] = useState<MonthOption>(monthOptions[0]) // Default: Jul-2025

    const handleApply = () => {
        onChange(selectedMonth)
        onClose()
    }

    return (
        <div className="fixed top-0 z-20 w-full mx-auto left-0 h-screen bg-white">
            <LayoutHeader
                tab="Select By Month"
                onBack={() => {
                    onChange(selectedMonth)
                    onClose()

                }}
                icon="x"
            />

            {/* Month Selection List */}
            <div className="px-4 py-6">
                <div className="space-y-1">
                    {monthOptions.map((month) => (
                        <button
                            key={month.id}
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
            <div className="absolute bottom-8 left-4 right-4">
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
