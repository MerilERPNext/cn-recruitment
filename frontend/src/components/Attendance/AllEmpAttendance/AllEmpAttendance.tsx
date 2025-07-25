import { useNavigate } from "react-router"
import LayoutHeader from "../../shared/LayoutHeader"
import { CalendarDays } from "lucide-react"
import { useState } from "react"
import SelectByMonth, { MonthOption } from "./SelectByMonth"

interface AttendanceDay {
    date: number
    month: string
    day: string
    status: string
    location: string
    statusColor: string
}

const attendanceData: AttendanceDay[] = [
    {
        date: 1,
        month: "Jul",
        day: "Tue",
        status: "On Leave (Loss of Pay)",
        location: "General (Office)",
        statusColor: "text-purple-600",
    },
    {
        date: 2,
        month: "Jul",
        day: "Wed",
        status: "Unpaid",
        location: "General (Office)",
        statusColor: "text-purple-600",
    },
    {
        date: 3,
        month: "Jul",
        day: "Thu",
        status: "Unpaid",
        location: "General (Office)",
        statusColor: "text-purple-600",
    },
    {
        date: 4,
        month: "Jul",
        day: "Fri",
        status: "Unpaid",
        location: "General (Office)",
        statusColor: "text-purple-600",
    },
    {
        date: 5,
        month: "Jul",
        day: "Sat",
        status: "Unpaid",
        location: "General (Office)",
        statusColor: "text-purple-600",
    },
    {
        date: 6,
        month: "Jul",
        day: "Sun",
        status: "Weekly Off",
        location: "General (Office)",
        statusColor: "text-purple-600",
    },
    {
        date: 7,
        month: "Jul",
        day: "Mon",
        status: "On Leave (Loss of Pay)",
        location: "General (Office)",
        statusColor: "text-purple-600",
    },
    {
        date: 8,
        month: "Jul",
        day: "Tue",
        status: "Unpaid",
        location: "General (Office)",
        statusColor: "text-purple-600",
    },
    {
        date: 9,
        month: "Jul",
        day: "Wed",
        status: "Weekly Off",
        location: "General (Office)",
        statusColor: "text-purple-600",
    },
    {
        date: 10,
        month: "Jul",
        day: "Thu",
        status: "On Leave (Loss of Pay)",
        location: "General (Office)",
        statusColor: "text-purple-600",
    },
    {
        date: 11,
        month: "Jul",
        day: "Fri",
        status: "Unpaid",
        location: "General (Office)",
        statusColor: "text-purple-600",
    },
]

const AllEmpAttendance = () => {
    const navigate = useNavigate()
    const [showSelectByMonth, setShowSelectByMonth] = useState(false)
    const [selectedMonth, setSelectedMonth] = useState<MonthOption>({
        id: "1",
        label: "Jul-2025",
        value: "2025-07",
    })

    // Map month string to abbreviation
    const getMonthAbbreviation = (value: string) => {
        const date = new Date(value + "-01")
        return date.toLocaleString("default", { month: "short" }) // "Jul"
    }

    const monthAbbr = getMonthAbbreviation(selectedMonth.value)
    const filteredAttendance = attendanceData.filter(
        (day) => day.month === monthAbbr
    )

    return (
        <>
            <LayoutHeader
                tab={"All Attendance"}
                onBack={() => navigate(-1)}
                children={
                    <button onClick={() => setShowSelectByMonth(true)}>
                        <CalendarDays />
                    </button>
                }
            />

            <div className="max-w-md mx-auto bg-white">
                <h2 className="font-semibold text-lg text-center py-2">{selectedMonth?.label}</h2>
                <div className="divide-y divide-gray-200">
                    {filteredAttendance?.length > 0 ? filteredAttendance.map((day) => (
                        <div key={day.date} className="flex items-center py-4 px-6">
                            <div className="flex flex-col items-center w-12 mr-6">
                                <div className="text-lg font-semibold text-gray-900">{day.date}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-wide">{day.month}</div>
                                <div className="text-xs text-gray-500 capitalize">{day.day}</div>
                            </div>
                            <div className="flex-1">
                                <div className={`font-medium ${day.statusColor} mb-1`}>{day.status}</div>
                                <div className="text-sm text-gray-400">{day.location}</div>
                            </div>
                        </div>
                    )) : <div className="h-screen w-full flex items-center justify-center">
                        <p className="text-medium text-gray-500">No Data Available</p>
                    </div>}
                </div>
            </div>

            {showSelectByMonth && (
                <SelectByMonth
                    onClose={() => setShowSelectByMonth(false)}
                    onChange={(monthObj) => {
                        setSelectedMonth(monthObj)
                        setShowSelectByMonth(false)
                    }}
                />
            )}
        </>
    )
}

export default AllEmpAttendance